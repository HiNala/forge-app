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
from app.core.errors import Conflict, ForgeError
from app.core.logging import configure_logging
from app.core.sentry import init_sentry
from app.db.session import AsyncSessionLocal, engine
from app.middleware import (
    BodySizeLimitMiddleware,
    RateLimitMiddleware,
    RequestContextMiddleware,
    TenantMiddleware,
)

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
        from app.services.analytics.ingestion import start_consumer

        start_consumer()
    except Exception as e:
        logger.warning("analytics ingestion consumer: %s", e)
    try:
        yield
    finally:
        try:
            from app.services.analytics.ingestion import shutdown_consumer

            await shutdown_consumer()
        except Exception as e:
            logger.warning("analytics ingestion shutdown: %s", e)
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
)

# Last ``add_middleware`` runs first on ingress (Starlette). Order: RequestContext → … → CORS → app.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
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
    ],
    expose_headers=["X-Request-ID"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=_trusted_hosts())
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(BodySizeLimitMiddleware)
app.add_middleware(RequestContextMiddleware)


@app.exception_handler(ForgeError)
async def forge_exception_handler(request: Request, exc: ForgeError) -> JSONResponse:
    rid = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.http_status,
        content={
            "code": exc.code,
            "message": exc.message,
            "extra": exc.extra,
            "request_id": rid,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    rid = getattr(request.state, "request_id", None)
    flattened: list[dict[str, str]] = []
    for err in exc.errors():
        loc = err.get("loc") or ()
        field = ".".join(str(x) for x in loc if str(x) != "body")
        flattened.append({"field": field or "body", "message": err.get("msg", "invalid")})
    return JSONResponse(
        status_code=422,
        content={
            "code": "validation_error",
            "message": "Request validation failed",
            "errors": flattened,
            "request_id": rid,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    rid = getattr(request.state, "request_id", None)
    body: dict[str, Any] = {"request_id": rid}
    detail = exc.detail
    if isinstance(detail, dict):
        body["detail"] = detail
    else:
        body["detail"] = detail
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning("db integrity error: %s", exc)
    return await forge_exception_handler(request, Conflict("Constraint violation"))


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error", exc_info=exc)
    rid = getattr(request.state, "request_id", None)
    if settings.ENVIRONMENT == "production":
        return JSONResponse(
            status_code=500,
            content={
                "code": "internal_error",
                "message": "An unexpected error occurred",
                "request_id": rid,
            },
        )
    return JSONResponse(
        status_code=500,
        content={
            "code": "internal_error",
            "message": str(exc) or "internal error",
            "request_id": rid,
        },
    )


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
