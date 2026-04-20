"""Redis-backed fixed-window rate limits with in-process fallback (BI-02)."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger(__name__)

_RL_AUTH_USER_PER_MIN = 120
_RL_STUDIO_PER_MIN = 10
_RL_PUBLIC_IP_PER_MIN = 60
_RL_SUBMIT_IP_PER_MIN = 5
_RL_SUBMIT_PAGE_PER_MIN = 30
_RL_PUBLIC_TRACK_PER_MIN = 60
_RL_ANALYTICS_TRACK_PER_MIN = 600

_EXEMPT_PATH_PREFIXES: tuple[str, ...] = (
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/v1/webhooks",
)
_EXEMPT_PATHS: frozenset[str] = frozenset(
    {
        "/metrics",
        f"{settings.API_V1_STR}/billing/webhook",
        f"{settings.API_V1_STR}/auth/webhook",
    }
)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _is_studio_post(request: Request) -> bool:
    return (
        request.method == "POST"
        and f"{settings.API_V1_STR}/studio" in request.url.path
    )


def _public_submit_keys(request: Request) -> tuple[str, str] | None:
    """``(ip_key, page_key)`` for POST ``/p/{org}/{page}/submit``."""
    path = request.url.path
    if request.method != "POST" or not path.startswith("/p/"):
        return None
    if not path.rstrip("/").endswith("/submit"):
        return None
    parts = [x for x in path.split("/") if x]
    if len(parts) < 3:
        return None
    org_slug, page_slug = parts[0], parts[1]
    ip = _client_ip(request)
    return (
        f"rl:psubmit:ip:{ip}",
        f"rl:psubmit:page:{org_slug}:{page_slug}",
    )


def _limit_key_and_max(request: Request) -> tuple[str | None, int]:
    path = request.url.path
    if path in _EXEMPT_PATHS:
        return None, 0
    for p in _EXEMPT_PATH_PREFIXES:
        if path == p or path.startswith(p + "/"):
            return None, 0

    sk = _public_submit_keys(request)
    if sk is not None:
        # handled in ``dispatch`` with two buckets — signal via sentinel
        return "__submit_dual__", 0

    if (
        path.startswith("/p/")
        and path.rstrip("/").endswith("/track")
        and request.method == "POST"
    ):
        return f"rl:ptrack:{_client_ip(request)}", _RL_PUBLIC_TRACK_PER_MIN

    if request.method == "POST" and path.rstrip("/") == f"{settings.API_V1_STR}/analytics/track":
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer ") and len(auth) > 24:
            h = hashlib.sha256(auth.encode()).hexdigest()[:32]
            return f"rl:atrack:tok:{h}", _RL_ANALYTICS_TRACK_PER_MIN

    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer ") and len(auth) > 24:
        h = hashlib.sha256(auth.encode()).hexdigest()[:32]
        if _is_studio_post(request):
            return f"rl:studio:tok:{h}", _RL_STUDIO_PER_MIN
        return f"rl:user:tok:{h}", _RL_AUTH_USER_PER_MIN

    if path.startswith(settings.API_V1_STR):
        return f"rl:api:{_client_ip(request)}", _RL_PUBLIC_IP_PER_MIN

    return None, 0


class _LocalWindow:
    __slots__ = ("_counts", "_bucket_start")

    def __init__(self) -> None:
        self._counts: dict[str, int] = defaultdict(int)
        self._bucket_start: float = time.monotonic()

    def _roll(self) -> None:
        now = time.monotonic()
        if now - self._bucket_start >= 60.0:
            self._counts.clear()
            self._bucket_start = now

    def allow(self, key: str, limit: int) -> bool:
        self._roll()
        n = self._counts[key] + 1
        if n > limit:
            return False
        self._counts[key] = n
        return True


_local = _LocalWindow()


async def _incr_redis(r: Any, key: str, limit: int) -> bool:
    n = await r.incr(key)
    if n == 1:
        await r.expire(key, 120)
    return int(n) <= limit


def _rate_limited_response() -> Response:
    body = json.dumps(
        {"code": "rate_limited", "retry_after_seconds": 60, "message": "Too many requests"}
    )
    return Response(
        content=body,
        status_code=429,
        media_type="application/json",
        headers={"Retry-After": "60"},
    )


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # Deterministic integration tests unless ``RATE_LIMIT_IN_TESTS`` is enabled.
        if settings.ENVIRONMENT == "test" and not settings.RATE_LIMIT_IN_TESTS:
            return await call_next(request)

        submit_keys = _public_submit_keys(request)
        if submit_keys is not None:
            ip_key, page_key = submit_keys
            r: Any | None = getattr(request.app.state, "redis", None)
            minute = int(time.time() // 60)

            async def check_pair() -> bool:
                if r is not None:
                    ok_ip = await _incr_redis(r, f"{ip_key}:{minute}", _RL_SUBMIT_IP_PER_MIN)
                    ok_page = await _incr_redis(r, f"{page_key}:{minute}", _RL_SUBMIT_PAGE_PER_MIN)
                    return ok_ip and ok_page
                return _local.allow(f"{ip_key}:{minute}", _RL_SUBMIT_IP_PER_MIN) and _local.allow(
                    f"{page_key}:{minute}", _RL_SUBMIT_PAGE_PER_MIN
                )

            try:
                ok = await check_pair()
            except Exception as e:
                logger.warning("rate_limit redis fallback: %s", e)
                ok = _local.allow(f"{ip_key}:{minute}", _RL_SUBMIT_IP_PER_MIN) and _local.allow(
                    f"{page_key}:{minute}", _RL_SUBMIT_PAGE_PER_MIN
                )
            if not ok:
                return _rate_limited_response()
            return await call_next(request)

        key, limit = _limit_key_and_max(request)
        if key is None or limit <= 0:
            return await call_next(request)

        r = getattr(request.app.state, "redis", None)
        ok = False
        if r is not None:
            try:
                redis_key = f"{key}:{int(time.time() // 60)}"
                ok = await _incr_redis(r, redis_key, limit)
            except Exception as e:
                logger.warning("rate_limit redis fallback: %s", e)
                ok = _local.allow(key, limit)
        else:
            ok = _local.allow(key, limit)

        if not ok:
            return _rate_limited_response()
        return await call_next(request)
