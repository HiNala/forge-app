# BACKEND-INFRA MISSION BI-02 — Middleware, Tenant Context & Request Routing

**Goal:** Build the request pipeline that turns a raw HTTP request into an authenticated, tenant-scoped, rate-limited, observable unit of work. Every request that touches application data passes through the same middleware stack. The tenant context is resolved early, propagated via `ContextVar` through the async call tree, and enforced on every database connection checkout via `SET app.current_org_id`. After this mission, a FastAPI route handler can declare `db: AsyncSession = Depends(get_tenant_db)` and be confident that any query it runs is already scoped to the right organization by the database itself.

**Branch:** `mission-bi-02-middleware-routing`
**Prerequisites:** BI-01 complete — RLS is enforced on all tenant tables, helper functions `current_org_id()` and `current_user_id()` exist.
**Estimated scope:** Medium. Middleware is small in code but high in consequence. Test coverage has to be thorough.

---

## Experts Consulted On This Mission

- **Jef Raskin** — *Does the pipeline have modes? Is the behavior predictable at every stage?*
- **Linus Torvalds** — *Does this scale? Will it degrade gracefully under bad inputs?*
- **Jakob Nielsen** — *When something fails, is the error actionable for the consumer of the API?*

---

## How To Run This Mission

The reference architecture: an incoming request flows through middleware in this order. **Order matters.**

1. **Request ID** (generated or propagated from an upstream proxy; logged on every line for correlation)
2. **Structured logging** (records start/end timing)
3. **CORS** (correctly configured per environment)
4. **Body size limit** (rejects requests > 10MB unless specifically whitelisted)
5. **Rate limiting** (per-IP on public endpoints, per-user on authenticated)
6. **Authentication** (resolves the user from the session token or JWT)
7. **Tenant resolution** (resolves the active organization from header or subdomain)
8. **Tenant membership enforcement** (the resolved user must be a member of the resolved org)
9. **Route handling** (with `Depends(get_tenant_db)` for anything touching data)
10. **Exception translation** (typed errors → HTTP status + structured body)
11. **Response logging + metrics**

Read `docs/external/backend/fastapi-middleware.md` before starting. The Medium guide "Building Multi-Tenant APIs with FastAPI and Subdomain Routing" is a good reference for the shape; our implementation diverges in one key way — we use a pooled shared DB with RLS, not per-tenant connections.

Commit on milestones: base middleware stack, auth integration, tenant middleware, rate limiting, error handling, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Request Context & Logging

1. Create `apps/api/app/core/context.py` with `ContextVar`-based request context:
    ```python
    from contextvars import ContextVar
    from dataclasses import dataclass
    from uuid import UUID
    from typing import Optional

    @dataclass
    class RequestContext:
        request_id: str
        user_id: Optional[UUID] = None
        organization_id: Optional[UUID] = None
        user_role: Optional[str] = None   # 'owner' | 'editor' | 'viewer'
        is_admin: bool = False

    _request_context: ContextVar[Optional[RequestContext]] = ContextVar("request_ctx", default=None)

    def get_request_context() -> RequestContext:
        ctx = _request_context.get()
        if ctx is None:
            raise RuntimeError("request context not set")
        return ctx

    def set_request_context(ctx: RequestContext) -> None:
        _request_context.set(ctx)
    ```
2. Configure structured logging with `structlog`. JSON output in production, colored console in dev. Every log entry automatically includes `request_id`, `user_id`, `organization_id` pulled from the context. Configure once in `app/core/logging.py`.
3. Create `RequestIDMiddleware` (BaseHTTPMiddleware). Reads `X-Request-ID` from upstream, generates a UUID4 if absent. Attaches to `request.state.request_id` and the context. Echoes it back on the response.
4. Create `StructuredLoggingMiddleware`. Logs `http.request.started` at entry with method + path. Logs `http.request.finished` at exit with status + duration_ms. Uses `bind_contextvars()` so subsequent logs in the request inherit context.

### Phase 2 — CORS, Body Size, Compression

5. Configure FastAPI's `CORSMiddleware`:
    - Dev: allow `http://localhost:3000`, `http://localhost:3001` with credentials.
    - Staging/Prod: allow only the configured frontend origins from env (`CORS_ORIGINS`).
    - Never `allow_origins=["*"]` with `allow_credentials=True` (browsers reject).
    - Allowed headers include `X-Request-ID`, `X-Active-Org`, `Authorization`.
    - Expose `X-Request-ID` so the frontend can read it for support.
6. Add `TrustedHostMiddleware` with the env-configured host list (`forge.app`, `*.forge.app`, `staging.forge.app`, custom domain wildcards in prod).
7. Add a `BodySizeLimitMiddleware` (custom, BaseHTTPMiddleware). Default: reject > 10 MB with 413. File-upload endpoints under `/api/v1/uploads/*` get a 25 MB bump. Implement by reading `Content-Length` up-front and, as a defense in depth, streaming body read with a size counter that raises if exceeded.
8. Enable `GZipMiddleware` with `minimum_size=1024` — shrinks large JSON responses (analytics summaries).

### Phase 3 — Rate Limiting

9. Install `slowapi` (FastAPI-friendly fork of Flask-Limiter) or hand-roll with Redis. Recommend `slowapi` for speed to ship, hand-rolled if more control is needed later.
10. Create `app/core/rate_limit.py`:
    - Key function for authenticated endpoints: `user_id`.
    - Key function for public endpoints: `ip_address` (from `X-Forwarded-For`, honoring trusted proxies).
    - Key function for per-page submission endpoints: `{page_slug}:{ip}` (prevents one bad actor from flooding a single page).
    - Backing store: Redis.
11. Rate-limit defaults:
    - Authenticated API: 120 req/min per user.
    - Studio generate: 10 req/min per user (LLM cost control).
    - Public submission `POST /p/{slug}/submit`: 5 per IP per minute, 30 per page per minute across all IPs.
    - Analytics tracking `POST /p/{slug}/track`: 60 req/min per IP.
    - Webhooks (Stripe, Resend): no rate limit (trusted sources with signature verification).
12. When rate-limited, return `429 Too Many Requests` with `Retry-After` header and a JSON body `{"code":"rate_limited","retry_after_seconds":N}`.

### Phase 4 — Authentication Middleware

13. The auth provider is decided in Backend Mission 00 ADR-002 (Clerk or Auth.js). Whichever wins, the contract into the API is the same: an `Authorization: Bearer <token>` header (or a cookie-based session for same-site requests from the Next.js app).
14. Create `AuthMiddleware` that:
    - Skips `/health*`, `/metrics`, `/docs`, `/openapi.json`, `/api/v1/public/*`, `/p/*`, `/api/v1/webhooks/*` (webhooks use signature verification, not bearer).
    - On authenticated paths: verifies the token. For JWTs, check issuer, audience, expiry, signature (JWKS rotation via cached fetch with 1-hour TTL).
    - Resolves the user from `users` table (cached in Redis for 60s by sub/user ID).
    - Attaches `user_id` and `user_email` to `request.state` and the context.
    - On missing or invalid token: return 401 with `{"code":"unauthenticated"}`.
15. Token revocation: on signout, the auth provider invalidates the token. For JWT-based providers, rely on short expiry (15min) + refresh tokens. Keep a revocation set in Redis for emergency revoke (keyed by `jti`).

### Phase 5 — Tenant Resolution Middleware

16. Create `TenantMiddleware` that runs AFTER auth:
    - Skips the same public paths as Auth.
    - Resolves the active organization in this priority order:
        1. `X-Active-Org` header (UUID). The frontend sends this for every authenticated request.
        2. Subdomain (if the request host matches `{slug}.forge.app`). Used for potential future per-tenant custom domains on the app itself.
        3. Query parameter `?org=...` (only for specific dev/testing cases; disabled in prod).
    - If not resolved but the authenticated user is a member of exactly one organization, default to that.
    - If not resolved and the user is a member of multiple orgs, return 400 `{"code":"org_not_specified"}` — the frontend should prompt to pick.
17. Enforce membership:
    - Load the user's membership for the resolved org from the `memberships` table (cached per `(user_id, org_id)` for 60s in Redis).
    - If no membership exists, return 403 `{"code":"not_a_member"}`.
    - If membership status is expired/revoked, return 403 similarly.
    - Attach `organization_id` and `user_role` to context.
18. Cross-tenant membership cache invalidation: when a user is added/removed from an org, publish on a Redis pubsub channel `membership:invalidate:{user_id}` so all API instances drop their cache. Simple and reliable.

### Phase 6 — Database Session Dependency

19. Create `app/db/session.py`:
    ```python
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.core.context import get_request_context

    async def get_tenant_db() -> AsyncSession:
        """Yields an AsyncSession with session variables set for the current tenant."""
        ctx = get_request_context()
        async with AsyncSessionLocal() as session:
            # Set session variables on this connection
            await session.execute(
                text("SET LOCAL app.current_org_id = :org_id; "
                     "SET LOCAL app.current_user_id = :user_id; "
                     "SET LOCAL app.is_admin = :is_admin"),
                {
                    "org_id": str(ctx.organization_id) if ctx.organization_id else "",
                    "user_id": str(ctx.user_id) if ctx.user_id else "",
                    "is_admin": "t" if ctx.is_admin else "f",
                }
            )
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    ```
    `SET LOCAL` scopes the variable to the transaction — releases when the session's transaction ends. Cleaner than resetting on checkin.
20. For admin / cross-tenant endpoints: a separate `get_admin_db()` that connects as `forge_admin` (BYPASSRLS), never sets tenant vars. Only used in `/api/v1/admin/*` routes gated by the `is_admin` claim.
21. For public endpoints (`/p/{slug}/*`): a `get_public_db()` that resolves the org from the slug lookup first, then sets context for the rest of the request. This way the submission endpoint's inserts into `submissions` still hit RLS correctly.

### Phase 7 — Router Structure

22. Lay out routers under `apps/api/app/routers/`:
    ```
    auth/          # sign in, sign out, signup handshake, me
    orgs/          # create, switch, list memberships, invitations
    pages/         # CRUD pages, revisions, publish
    studio/        # AI orchestration entry points (SSE)
    submissions/   # list, detail, reply, export
    automations/   # per-page automation config, integrations
    analytics/     # org + per-page summaries, funnels, raw events
    billing/       # Stripe checkout, portal, webhook, plan, usage
    templates/     # public list, use-template
    calendars/     # ICS upload, availability endpoints
    uploads/       # presigned URL generation
    public/        # /p/{slug}/* rendering + submit + track
    webhooks/      # stripe, resend, clerk/auth-webhook
    admin/         # admin-only cross-tenant endpoints
    health/        # liveness, readiness, deep health
    ```
23. Each router lives in its own package with `routes.py`, `schemas.py`, `services.py`. Keep routes thin — they validate input, call services, serialize output. Business logic lives in services.
24. All routers are mounted under `/api/v1/` EXCEPT `/p/*` (public pages; pretty URLs), `/health*`, `/metrics`.
25. API versioning: `/api/v1/` is the stable version. When a breaking change ships, create `/api/v2/`. Non-breaking additions happen in place.

### Phase 8 — Pydantic Schemas & OpenAPI Discipline

26. Every request and response body is a Pydantic v2 model. No `Dict[str, Any]` in signatures. Models live next to their routes in `schemas.py`.
27. Schema naming convention: `<Resource>Create`, `<Resource>Update`, `<Resource>Read`, `<Resource>Summary`, `<Resource>Detail`. Pagination responses: `Paginated[<Resource>Summary]`.
28. Attach examples to every field with `Field(..., examples=["..."])` so OpenAPI docs are immediately useful.
29. Add tags to every route so Swagger UI groups them. Tag names match the router package name.
30. Configure FastAPI to emit a rich OpenAPI spec: title, description, version pulled from the package, contact info, license, server URLs per environment.
31. Generate TypeScript types for the frontend via `openapi-typescript`:
    ```bash
    pnpm dlx openapi-typescript http://localhost:8000/openapi.json -o apps/web/src/lib/api/schema.ts
    ```
    Wire this into CI: if the generated file drifts from committed, fail the build. Forces frontend and backend to stay in sync.

### Phase 9 — Error Handling

32. Define typed exceptions in `app/core/errors.py`:
    - `ForgeError` (base) — attributes: `code: str`, `message: str`, `http_status: int`, `extra: dict = {}`.
    - `NotAuthenticated` → 401
    - `NotAuthorized` → 403
    - `NotFound` → 404
    - `ValidationError` → 422
    - `Conflict` → 409 (e.g., slug uniqueness)
    - `RateLimited` → 429
    - `QuotaExceeded` → 402 with `extra: {metric, current, limit, upgrade_url}`
    - `DependencyError` → 502 (Stripe/Resend/Google unreachable)
    - `InternalError` → 500 (last resort)
33. Register FastAPI exception handlers that serialize these uniformly:
    ```json
    {"code":"quota_exceeded","message":"Monthly submission limit reached","extra":{...},"request_id":"..."}
    ```
34. Handle SQLAlchemy `IntegrityError` — map unique violations to `Conflict`, FK violations to `NotFound`-like messages.
35. Handle Pydantic `ValidationError` — flatten into a list of `{field, message}` entries instead of Pydantic's nested default (which is confusing for frontend display).
36. Never leak stack traces. In prod, 5xx responses include only the request_id. The frontend can display "Something went wrong. Reference: abc-123".

### Phase 10 — Health & Readiness

37. Create `app/routers/health/routes.py`:
    - `GET /health/live` — returns 200 if the process is up. Used for liveness probe.
    - `GET /health/ready` — returns 200 if Postgres and Redis respond to `SELECT 1` / `PING`. Used for readiness probe.
    - `GET /health/deep` (authenticated / IP-restricted) — checks Postgres, Redis, S3, Resend, Stripe, Google Calendar, OpenAI API. Returns per-service status + latency. Used for ops dashboards.
38. Create `GET /metrics` (Prometheus format) with `prometheus_client`. Counters for requests (by method, route template, status), histograms for request duration and DB query duration, gauges for active SSE connections.

### Phase 11 — Observability

39. Sentry integration:
    - Capture unhandled exceptions.
    - `before_send` scrubs: `Authorization`, `Cookie`, `X-Api-Key`, any field matching `/password|secret|token/i`.
    - Set `user` context (id, email) from request context.
    - Tag events with `organization_id` and `request_id`.
40. OpenTelemetry traces (optional but recommended): instrument FastAPI, SQLAlchemy, httpx. Export to Sentry or a dedicated OTLP endpoint in prod.

### Phase 12 — Testing

41. `tests/test_middleware_chain.py` — asserts middleware runs in the documented order. Use a test client that records hook calls.
42. `tests/test_auth_middleware.py` — valid token → 200, missing token → 401, expired token → 401, wrong audience → 401.
43. `tests/test_tenant_middleware.py` — user in one org auto-resolves; user in two orgs without header → 400; user with header for org they're not in → 403.
44. `tests/test_rls_via_http.py` — spin up two orgs, log in as user A, call `GET /api/v1/pages` — must see only org A's pages. This is the end-to-end guardrail.
45. `tests/test_error_handling.py` — each exception type serializes correctly; stack traces never leak.
46. `tests/test_rate_limit.py` — exceed the limit → 429 with `Retry-After`. After TTL, requests succeed.
47. Test coverage ≥ 85% for middleware and core. Ratchet up in BI-04 polish.

### Phase 13 — Documentation

48. Write `docs/architecture/REQUEST_PIPELINE.md` — a diagram of the middleware stack, the responsibility of each layer, how context propagates, how to add a new middleware without breaking order.
49. Write `docs/runbooks/DEBUGGING_REQUESTS.md` — given a request_id from a user support ticket, how to pull the full trace from logs, what to look for in Sentry, common failure patterns.
50. Mission report.

---

## Acceptance Criteria

- Full middleware stack runs in the documented order with verified tests.
- Authentication works against the chosen provider; invalid tokens are rejected cleanly.
- Tenant resolution from header, subdomain, and implicit-single-org paths all work.
- Membership enforcement blocks cross-tenant access at the middleware layer (before it ever reaches the DB).
- `get_tenant_db()` sets `SET LOCAL` session vars, so RLS kicks in for every query.
- Rate limiting works per documented limits.
- Every route is thin, every business rule lives in services, every schema has examples.
- OpenAPI → TypeScript type generation is wired into CI.
- Error responses are consistent and scrubbed of PII.
- Sentry captures errors with scrubbed context.
- Health endpoints respond correctly.
- Tests pass and coverage ≥ 85% for middleware and core.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
