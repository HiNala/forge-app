"""Redis-backed fixed-window rate limits with in-process fallback (dev / redis down)."""

from __future__ import annotations

import hashlib
import logging
import time
from collections import defaultdict
from collections.abc import Awaitable, Callable

import redis.asyncio as redis
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

logger = logging.getLogger(__name__)

# PRD §11 — tuned per-path below
_RL_PUBLIC_IP_PER_MIN = 60
_RL_AUTH_BEARER_PER_MIN = 200
_RL_SUBMIT_PER_MIN = 10

_EXEMPT_PATH_PREFIXES: tuple[str, ...] = (
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/v1/webhooks",
)
_EXEMPT_PATHS: frozenset[str] = frozenset(
    {
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


def _limit_key_and_max(request: Request) -> tuple[str | None, int]:
    path = request.url.path
    if path in _EXEMPT_PATHS:
        return None, 0
    for p in _EXEMPT_PATH_PREFIXES:
        if path == p or path.startswith(p + "/"):
            return None, 0

    if path.startswith("/p/"):
        return f"rl:p:{_client_ip(request)}", _RL_SUBMIT_PER_MIN

    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer ") and len(auth) > 24:
        h = hashlib.sha256(auth.encode()).hexdigest()[:32]
        return f"rl:tok:{h}", _RL_AUTH_BEARER_PER_MIN

    if path.startswith(settings.API_V1_STR):
        return f"rl:api:{_client_ip(request)}", _RL_PUBLIC_IP_PER_MIN

    return None, 0


class _LocalWindow:
    """Minute bucket keyed by rate-limit key (fallback)."""

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


async def _incr_redis(r: redis.Redis, key: str, limit: int) -> bool:
    n = await r.incr(key)
    if n == 1:
        await r.expire(key, 120)
    return int(n) <= limit


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        key, limit = _limit_key_and_max(request)
        if key is None or limit <= 0:
            return await call_next(request)

        r: redis.Redis | None = getattr(request.app.state, "redis", None)
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
            return Response(
                content='{"detail":"Too many requests"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )
        return await call_next(request)
