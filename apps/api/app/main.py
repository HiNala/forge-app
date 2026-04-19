import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import redis.asyncio as redis
from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.caddy_internal import router as caddy_internal_router
from app.api.public_api import router as public_router
from app.api.public_proposal import router as public_proposal_router
from app.api.v1 import api_router
from app.config import settings
from app.core.errors import ForgeError
from app.core.exception_handlers import (
    forge_error_handler,
    forge_http_exception_handler,
    integrity_error_handler,
    payload_too_large_handler,
    request_validation_handler,
    unhandled_exception_handler,
)
from app.core.logging import configure_logging
from app.core.sentry import init_sentry
from app.db.session import AsyncSessionLocal, engine
from app.middleware import (
    BodySizeLimitMiddleware,
    RateLimitMiddleware,
    RequestContextMiddleware,
    TenantMiddleware,
)
from app.middleware.body_size_limit import PayloadTooLarge

configure_logging()
init_sentry()
logger = logging.getLogger(__name__)


def _trusted_hosts() -> list[str]:
    raw = settings.TRUSTED_HOSTS.strip()
    if raw == "*":
        return ["*"]
    return [h.strip() for h in raw.split(",") if h.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.redis = None
    app.state.arq_pool = None
    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        app.state.redis = client
    except Exception:
        app.state.redis = None
    if app.state.redis is not None:
        try:
            app.state.arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        except Exception as e:
            logger.warning("arq pool disabled: %s", e)
            app.state.arq_pool = None
    else:
        app.state.arq_pool = None
    try:
        yield
    finally:
        pool = getattr(app.state, "arq_pool", None)
        if pool is not None:
            await pool.close()
        r = getattr(app.state, "redis", None)
        if r is not None:
            await r.aclose()
        if settings.ENVIRONMENT == "production":
            await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Forge backend — AI page builder (see docs/plan/02_PRD.md).",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    contact={"name": "Forge", "url": settings.APP_PUBLIC_URL},
    license_info={"name": "Proprietary"},
    servers=[
        {"url": settings.API_BASE_URL, "description": settings.ENVIRONMENT},
    ],
)

# Last ``add_middleware`` wraps outermost (first to see the request). See ``docs/architecture/REQUEST_PIPELINE.md``.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.effective_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "authorization",
        "content-type",
        "x-request-id",
        "x-forge-active-org-id",
        "x-forge-tenant-id",
        "x-active-org",
        "x-forge-test-user-id",
        "x-forwarded-for",
    ],
    expose_headers=["X-Request-ID"],
)
app.add_middleware(TenantMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=_trusted_hosts())
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(RequestContextMiddleware)


app.add_exception_handler(ForgeError, forge_error_handler)
app.add_exception_handler(StarletteHTTPException, forge_http_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, request_validation_handler)  # type: ignore[arg-type]
app.add_exception_handler(IntegrityError, integrity_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(PayloadTooLarge, payload_too_large_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.get("/metrics")
def metrics() -> Response:
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)


app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(public_router)
app.include_router(public_proposal_router)
app.include_router(caddy_internal_router)


@app.get("/health/live")
def health_live() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready(request: Request) -> dict[str, Any]:
    checks: dict[str, str] = {}
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as e:
        logger.warning("health_ready postgres: %s", e)
        checks["postgres"] = "error"

    rc = getattr(request.app.state, "redis", None)
    if rc is None:
        checks["redis"] = "unavailable"
    else:
        try:
            await rc.ping()
            checks["redis"] = "ok"
        except Exception as e:
            logger.warning("health_ready redis: %s", e)
            checks["redis"] = "error"

    ready = checks.get("postgres") == "ok" and checks.get("redis") in ("ok", "unavailable")
    return {"status": "ready" if ready else "not_ready", "checks": checks}


@app.get("/health")
def health_legacy() -> dict[str, str]:
    """Backward-compatible liveness (BI-02: prefer ``/health/live``)."""
    return {"status": "healthy"}


@app.get("/health/deep")
async def health_deep(request: Request) -> dict[str, Any]:
    """Postgres + Redis probe (Mission 07). Optional integrations listed, non-blocking."""
    checks: dict[str, str] = {}
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as e:
        logger.warning("health_deep postgres: %s", e)
        checks["postgres"] = "error"

    rc = getattr(request.app.state, "redis", None)
    if rc is None:
        checks["redis"] = "unavailable"
    else:
        try:
            await rc.ping()
            checks["redis"] = "ok"
        except Exception as e:
            logger.warning("health_deep redis: %s", e)
            checks["redis"] = "error"

    checks["stripe_configured"] = "yes" if (settings.STRIPE_SECRET_KEY or "").strip() else "no"
    checks["resend_configured"] = "yes" if (settings.RESEND_API_KEY or "").strip() else "no"
    checks["openai_configured"] = "yes" if (settings.OPENAI_API_KEY or "").strip() else "no"

    critical_ok = checks.get("postgres") == "ok" and checks.get("redis") in ("ok", "unavailable")
    return {"status": "ok" if critical_ok else "degraded", "checks": checks}
