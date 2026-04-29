"""Deep health probes — dependency checks with latency and structured status (AL-01)."""

from __future__ import annotations

import asyncio
import contextlib
import hmac
import logging
import time
from functools import partial
from typing import Any

import boto3
import httpx
import stripe
from botocore.config import Config
from fastapi import HTTPException
from sqlalchemy import text
from starlette.requests import Request

from app.config import settings

logger = logging.getLogger(__name__)


def _elapsed_ms(start: float) -> float:
    return round((time.monotonic() - start) * 1000.0, 2)


def _make_check(
    *,
    ok: bool,
    start: float,
    message: str,
    degraded: bool = False,
    skipped: bool = False,
) -> dict[str, Any]:
    if skipped:
        status = "skipped"
    elif not ok:
        status = "error"
    elif degraded:
        status = "degraded"
    else:
        status = "ok"
    return {
        "status": status,
        "latency_ms": _elapsed_ms(start),
        "message": message,
    }


async def check_postgres() -> tuple[str, dict[str, Any]]:
    start = time.monotonic()
    from app.db.session import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=3.0)
        return ("postgres", _make_check(ok=True, start=start, message="select 1 ok"))
    except Exception as e:
        logger.warning("health postgres: %s", e)
        return ("postgres", _make_check(ok=False, start=start, message=str(e)[:500]))


async def check_redis_skipped_no_client() -> tuple[str, dict[str, Any]]:
    """App started without Redis (lifespan degraded)."""
    start = time.monotonic()
    return ("redis", _make_check(ok=True, start=start, message="redis client unavailable", skipped=True))


async def check_redis_ping(rc: Any) -> tuple[str, dict[str, Any]]:
    start = time.monotonic()
    try:
        await asyncio.wait_for(rc.ping(), timeout=2.0)
        sentinel = f"{settings.FORGE_CACHE_NS}:health_deep:sentinel"
        await asyncio.wait_for(rc.set(sentinel, "1", ex=120), timeout=2.0)
        v = await asyncio.wait_for(rc.get(sentinel), timeout=2.0)
        if v is None:
            return (
                "redis",
                _make_check(
                    ok=False,
                    start=start,
                    message="sentinel GET returned null after SET",
                    degraded=True,
                ),
            )
        return ("redis", _make_check(ok=True, start=start, message="ping + sentinel GET ok"))
    except Exception as e:
        logger.warning("health redis: %s", e)
        return ("redis", _make_check(ok=False, start=start, message=str(e)[:500]))


def _s3_sync_head_bucket() -> None:
    c = boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(
            signature_version="s3v4",
            connect_timeout=4,
            read_timeout=10,
            retries={"max_attempts": 1, "mode": "standard"},
        ),
    )
    c.head_bucket(Bucket=settings.S3_BUCKET)


async def check_s3_storage() -> tuple[str, dict[str, Any]]:
    start = time.monotonic()
    try:
        loop = asyncio.get_running_loop()
        await asyncio.wait_for(loop.run_in_executor(None, _s3_sync_head_bucket), timeout=5.0)
        return ("s3", _make_check(ok=True, start=start, message=f"head_bucket {settings.S3_BUCKET}"))
    except Exception as e:
        logger.warning("health s3: %s", e)
        return ("s3", _make_check(ok=False, start=start, message=str(e)[:500], degraded=True))


async def check_stripe() -> tuple[str, dict[str, Any]]:
    start = time.monotonic()
    key = (settings.STRIPE_SECRET_KEY or "").strip()
    if not key:
        return (
            "stripe",
            _make_check(ok=True, start=start, message="STRIPE_SECRET_KEY not configured", skipped=True),
        )
    try:
        loop = asyncio.get_running_loop()
        await asyncio.wait_for(
            loop.run_in_executor(
                None,
                partial(lambda: stripe.Customer.list(api_key=key, limit=1)),
            ),
            timeout=5.0,
        )
        return ("stripe", _make_check(ok=True, start=start, message="customers.list(limit=1) ok"))
    except Exception as e:
        logger.warning("health stripe: %s", e)
        return ("stripe", _make_check(ok=False, start=start, message=str(e)[:500], degraded=True))


async def check_resend() -> tuple[str, dict[str, Any]]:
    """Lightweight GET to Resend domains API when key exists."""
    start = time.monotonic()
    api_key = (settings.RESEND_API_KEY or "").strip()
    if not api_key:
        return ("resend", _make_check(ok=True, start=start, message="RESEND_API_KEY not set", skipped=True))
    url = "https://api.resend.com/domains"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url, headers={"Authorization": f"Bearer {api_key}"})
        msg = f"GET {url} HTTP {r.status_code}"
        if r.status_code >= 500:
            return ("resend", _make_check(ok=False, start=start, message=msg, degraded=True))
        return ("resend", _make_check(ok=True, start=start, message=msg))
    except Exception as e:
        logger.warning("health resend: %s", e)
        return ("resend", _make_check(ok=False, start=start, message=str(e)[:500], degraded=True))


async def check_google_calendar() -> tuple[str, dict[str, Any]]:
    """No sentinel integration row — defer to future CALENDAR_HEALTH_* wiring."""
    start = time.monotonic()
    return (
        "google_calendar",
        _make_check(
            ok=True,
            start=start,
            message="skipped — no sentinel OAuth refresh wired for proactive token check",
            skipped=True,
        ),
    )


async def check_auth_config() -> tuple[str, dict[str, Any]]:
    start = time.monotonic()
    if len(settings.auth_jwt_secret) < 32:
        return ("auth", _make_check(ok=False, start=start, message="AUTH_JWT_SECRET is too short", degraded=True))
    msg = "jwt secret configured"
    if not settings.google_auth_client_id:
        msg += "; Google login not configured"
    return ("auth", _make_check(ok=True, start=start, message=msg))


async def check_llm_openai_ping(rc: Any | None) -> tuple[str, dict[str, Any]]:
    """Small OpenAI completion — cached ~5 minutes in Redis to avoid hammering."""
    cache_key = f"{settings.FORGE_CACHE_NS}:health:llm:openai:ping"
    start = time.monotonic()
    api_key = (settings.OPENAI_API_KEY or "").strip()
    if not api_key:
        return ("openai", _make_check(ok=True, start=start, message="OPENAI_API_KEY not set", skipped=True))

    if rc is not None:
        try:
            cached = await asyncio.wait_for(rc.get(cache_key), timeout=2.0)
            if cached:
                return (
                    "openai",
                    _make_check(
                        ok=True,
                        start=start,
                        degraded=True,
                        message="cache hit — last probe within 300s (not re-calling OpenAI)",
                    ),
                )
        except Exception:
            pass

    url = "https://api.openai.com/v1/chat/completions"
    body = {
        "model": settings.LLM_MODEL_INTENT,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 5,
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=body)
        msg = f"HTTP {r.status_code}"
        if r.status_code != 200:
            return ("openai", _make_check(ok=False, start=start, message=msg, degraded=True))
        if rc is not None:
            with contextlib.suppress(Exception):
                await asyncio.wait_for(rc.set(cache_key, "1", ex=300), timeout=2.0)
        return ("openai", _make_check(ok=True, start=start, message="completion probe ok"))
    except Exception as e:
        logger.warning("health openai: %s", e)
        return ("openai", _make_check(ok=False, start=start, message=str(e)[:500], degraded=True))


async def check_arq_queue(rc: Any | None) -> tuple[str, dict[str, Any]]:
    """arq default queue sorted-set depth (arq:queue)."""
    start = time.monotonic()
    if rc is None:
        return ("arq_queue", _make_check(ok=True, start=start, message="redis client unavailable", skipped=True))
    try:
        depth = await asyncio.wait_for(rc.zcard("arq:queue"), timeout=2.0)
        oldest_age_s: float | None = None
        raw = await asyncio.wait_for(rc.zrange("arq:queue", 0, 0, withscores=True), timeout=2.0)
        if raw:
            ms = raw[0][1]
            oldest_age_s = max(0.0, (time.time() * 1000.0 - float(ms)) / 1000.0)
        age_msg = f"oldest_age_s≈{oldest_age_s:.1f}" if oldest_age_s is not None else "queue empty"
        return ("arq_queue", _make_check(ok=True, start=start, message=f"pending={depth} {age_msg}"))
    except Exception as e:
        logger.warning("health arq queue: %s", e)
        return ("arq_queue", _make_check(ok=False, start=start, message=str(e)[:500], degraded=True))


def authorize_deep_health_request(request: Request) -> None:
    """Bearer ``METRICS_TOKEN`` when configured (same policy as ``/metrics``)."""
    expected = (settings.METRICS_TOKEN or "").strip()
    if not expected:
        return
    auth = request.headers.get("authorization") or ""
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(token.strip(), expected):
        raise HTTPException(status_code=401, detail="metrics token required for deep health")


async def run_deep_health(request: Request) -> dict[str, Any]:
    rc = getattr(request.app.state, "redis", None)
    coroutines: list[Any] = [check_postgres()]
    coroutines.append(check_redis_ping(rc) if rc is not None else check_redis_skipped_no_client())
    coroutines.extend(
        [
            check_s3_storage(),
            check_stripe(),
            check_resend(),
            check_google_calendar(),
            check_auth_config(),
            check_llm_openai_ping(rc),
            check_arq_queue(rc),
        ]
    )

    raw_results = await asyncio.gather(*coroutines, return_exceptions=True)
    order_ids = ["postgres", "redis", "s3", "stripe", "resend", "google_calendar", "auth", "openai", "arq_queue"]

    pairs: dict[str, dict[str, Any]] = {}
    for idx, res in enumerate(raw_results):
        sid = order_ids[idx]
        if isinstance(res, BaseException):
            logger.warning("health_deep %s failed: %s", sid, res)
            pairs[sid] = {
                "status": "error",
                "latency_ms": 0.0,
                "message": str(res)[:500],
            }
            continue
        if isinstance(res, tuple) and len(res) == 2:
            service_id, payload = res[0], res[1]
            pairs[service_id] = payload
        else:
            pairs[sid] = {"status": "error", "latency_ms": 0.0, "message": "unexpected check result"}

    defaults = ["postgres", "redis", "s3", "stripe", "resend", "google_calendar", "auth", "openai", "arq_queue"]
    for sid in defaults:
        if sid not in pairs:
            pairs[sid] = {
                "status": "error",
                "latency_ms": 0.0,
                "message": "check raised or returned unexpectedly",
            }

    postgres_st = pairs["postgres"]["status"]
    redis_st = pairs["redis"]["status"]

    optional_non_ok = any(
        pairs[k]["status"] in ("error", "degraded")
        for k in ("s3", "stripe", "resend", "google_calendar", "auth", "openai", "arq_queue")
    )

    # Critical path: Postgres + Redis (when wired). Redis intentionally absent → degraded.
    if postgres_st != "ok":
        overall: str = "error"
    elif rc is None and redis_st == "skipped":
        overall = "degraded"
    elif redis_st != "ok":
        overall = "error"
    elif optional_non_ok:
        overall = "degraded"
    else:
        overall = "ok"

    return {"status": overall, "checks": pairs}

