# HTTP request pipeline (Forge API)

## Ingress order

Middleware is registered in `apps/api/app/main.py`. In Starlette, the **last** `add_middleware` call wraps the outermost layer (first to see the incoming request). Effective order on the wire:

1. **`RequestContextMiddleware`** — `X-Request-ID`, :class:`~app.core.context.RequestContext`, structlog contextvars, `http.request.started` / `http.request.finished`.
2. **`BodySizeLimitMiddleware`** — rejects bodies over 10 MiB (25 MiB for paths under `/api/v1/uploads` when added).
3. **`GZipMiddleware`**
4. **`TrustedHostMiddleware`** — hosts from `TRUSTED_HOSTS` (`*` in dev).
5. **`TenantMiddleware`** — primes `request.state.tenant_id` when the org header is already a bare UUID (full resolution, membership, and single-org default run in `optional_tenant`).
6. **`RateLimitMiddleware`** — Redis fixed windows with in-process fallback; webhooks and health exempt.
7. **`CORSMiddleware`** — origins from `BACKEND_CORS_ORIGINS` (alias env `CORS_ORIGINS`), exposes `X-Request-ID`.

Authentication and tenant membership run in **FastAPI dependencies** (`require_user`, `optional_tenant`, `require_tenant`), not in separate JWT middleware, to stay aligned with Clerk verification in `app.deps.auth`.

## Errors and validation

- `ForgeError` subclasses → JSON `{code, message, extra, request_id}`.
- `RequestValidationError` → `{code: validation_error, errors: [{field, message}], request_id}`.
- `HTTPException` / Starlette → `{detail, request_id}` (detail may be string or dict with `code` from dependencies).
- `IntegrityError` → mapped to `Conflict` (`409`) via `ForgeError` serialization.
- Unhandled exceptions → `500` with generic copy in production (no stack trace); `request_id` always present when `RequestContextMiddleware` ran.

## Observability

- **Sentry**: initialized in `app/core/sentry.py` when `SENTRY_DSN` is set; scrubs sensitive headers/fields in `before_send`.
- **Prometheus**: `GET /metrics` (unchanged).

## Database session

`get_db` / `get_tenant_db` sets transaction-scoped GUCs via `set_config(..., is_local=True)` in `app.db.rls_context` so PostgreSQL RLS policies apply without leaking tenant state across pooled connections. `app.is_admin` is set from `request.state.is_admin` (reserved).

`get_admin_db` is a **placeholder** raising `NotAuthorized` until a dedicated `FORGE_ADMIN_DATABASE_URL` / `forge_admin` engine exists; operator tools today use `FORGE_OPERATOR_ORG_IDS` + `get_db`.

## Rate limiting tests

Set `RATE_LIMIT_IN_TESTS=true` so `RateLimitMiddleware` applies under `ENVIRONMENT=test` (normally disabled for deterministic tests).

## Adding middleware

- Insert new stack layers in `main.py` only, and document order here.
- Avoid importing `app.deps` from middleware modules (import cycles); keep header parsing duplicated as in `TenantMiddleware` vs `raw_active_organization_id`.
