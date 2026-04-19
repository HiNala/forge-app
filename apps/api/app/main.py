from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.public_api import router as public_router
from app.api.v1 import api_router
from app.config import settings
from app.db.session import engine
from app.middleware import RateLimitMiddleware, TenantMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = None
    try:
        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        app.state.redis = client
    except Exception:
        app.state.redis = None
    try:
        yield
    finally:
        r = getattr(app.state, "redis", None)
        if r is not None:
            await r.aclose()
        # Avoid disposing the process-global engine during TestClient/pytest runs —
        # later tests and asyncio fixtures still use ``engine``.
        if settings.ENVIRONMENT == "production":
            await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Forge backend — AI page builder (see docs/plan/02_PRD.md).",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(TenantMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(public_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}
