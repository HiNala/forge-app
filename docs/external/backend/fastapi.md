# FastAPI — Reference for Forge

**Version:** 0.136.0
**Last researched:** 2026-04-19

## What Forge Uses

FastAPI as the backend API framework. Key features used: lifespan context manager, dependency injection (`Depends`), SSE via `EventSourceResponse`, CORS middleware, tenant isolation middleware, rate limiting middleware, and Pydantic v2 integration.

## App Factory Pattern

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk
from app.config import settings
from app.db.session import engine
from app.api.v1 import api_router
from app.middleware.tenant import TenantMiddleware
from app.middleware.rate_limit import RateLimitMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    sentry_sdk.init(dsn=settings.SENTRY_DSN, environment=settings.ENVIRONMENT)
    yield
    # Shutdown
    await engine.dispose()

def create_app() -> FastAPI:
    app = FastAPI(
        title="Forge API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    )

    # Middleware (order matters — last added = first executed)
    app.add_middleware(TenantMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app

app = create_app()
```

## Dependency Injection

```python
# app/db/session.py
from typing import AsyncGenerator, Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

engine = create_async_engine(settings.DATABASE_URL, pool_size=20, max_overflow=10)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

# Type alias for clean injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
```

```python
# Usage in routes
@router.get("/pages")
async def list_pages(db: DbSession, request: Request):
    org_id = request.state.org_id
    result = await db.execute(select(Page).where(Page.organization_id == org_id))
    return result.scalars().all()
```

## SSE with EventSourceResponse

```python
# app/api/v1/studio.py
from sse_starlette.sse import EventSourceResponse
from fastapi import Request

@router.post("/studio/generate")
async def generate_page(request: Request, body: GenerateRequest, db: DbSession):
    async def event_generator():
        try:
            # Intent parsing
            intent = await parse_intent(body.prompt)
            yield {"event": "intent", "data": intent.model_dump_json()}

            # HTML generation (streaming)
            yield {"event": "html.start", "data": "{}"}
            async for chunk in compose_page(intent, brand_kit):
                yield {"event": "html.chunk", "data": json.dumps({"chunk": chunk})}

            # Completion
            page = await save_page(db, intent, html)
            yield {"event": "html.complete", "data": json.dumps({
                "page_id": str(page.id),
                "slug": page.slug,
            })}
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"message": str(e)})}

    return EventSourceResponse(
        event_generator(),
        headers={"X-Accel-Buffering": "no"},
    )
```

## Tenant Middleware Pattern

```python
# app/middleware/tenant.py
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

PUBLIC_PATHS = {"/health", "/docs", "/openapi.json", "/api/v1/auth/webhook"}
PUBLIC_PREFIXES = ("/p/",)

class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip public paths
        if path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return await call_next(request)

        # Extract org from auth context (set by auth middleware upstream)
        org_id = getattr(request.state, 'org_id', None)
        if not org_id:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

        # Set PostgreSQL session variable for RLS
        # This is done per-request in the db session dependency instead
        return await call_next(request)
```

## Rate Limiting

```python
# app/middleware/rate_limit.py
import redis.asyncio as redis
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.redis = redis.from_url(settings.REDIS_URL)

    async def dispatch(self, request, call_next):
        # Different limits for different paths
        if request.url.path.startswith("/p/") and request.method == "POST":
            limit, window = 10, 60  # 10/min for public submissions
        elif hasattr(request.state, 'user_id'):
            limit, window = 200, 60  # 200/min for auth'd users
        else:
            limit, window = 60, 60  # 60/min for anonymous

        key = f"rate:{request.client.host}:{request.url.path}"
        count = await self.redis.incr(key)
        if count == 1:
            await self.redis.expire(key, window)
        if count > limit:
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)

        return await call_next(request)
```

## Known Pitfalls

1. **Middleware order**: Last added = first executed. Add CORS first (outermost), then rate limit, then tenant.
2. **`lifespan` replaces `on_event`**: Don't use `@app.on_event("startup")` — it's deprecated.
3. **`BackgroundTasks` vs arq**: Use `BackgroundTasks` only for fire-and-forget trivial tasks. Use arq for anything that needs retry or persistence.
4. **`expire_on_commit=False`**: Critical for async SQLAlchemy sessions.
5. **`X-Accel-Buffering: no`**: Required for SSE through Nginx/Caddy reverse proxies.

## Links
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Lifespan](https://fastapi.tiangolo.com/advanced/events/)
- [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
