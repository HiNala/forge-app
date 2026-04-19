# HTTP request pipeline (Forge API)

## Ingress order

Middleware is registered in `apps/api/app/main.py`. In Starlette, `app.user_middleware` lists **outermost first** (the first layer that sees an incoming request). Effective order on the wire:

1. **`RequestContextMiddleware`** — `X-Request-ID`, :class:`~app.core.context.RequestContext`, structlog contextvars, `http.request.started` / `http.request.finished`.
2. **`BodySizeLimitMiddleware`** — rejects bodies over 10 MiB (25 MiB for paths under `/api/v1/uploads/*`); streaming defense when `Content-Length` is absent.
3. **`GZipMiddleware`** — compresses responses (`minimum_size=1024`).
4. **`TrustedHostMiddleware`** — hosts from `TRUSTED_HOSTS` (`*` in dev).
5. **`RateLimitMiddleware`** — Redis fixed windows with in-process fallback; webhooks and health exempt; see `FORCE_RATE_LIMIT_IN_TESTS` for pytest.
6. **`TenantMiddleware`** — primes `request.state.tenant_id` when the org header is already a bare UUID (full resolution, membership, and single-org default run in `optional_tenant`).
7. **`CORSMiddleware`** — origins from `settings.effective_cors_origins()` (`BACKEND_CORS_ORIGINS` + optional `CORS_ORIGINS_EXTRA`), exposes `X-Request-ID`.

Authentication and tenant membership run in **FastAPI dependencies** (`require_user`, `optional_tenant`, `require_tenant`), not in a separate JWT middleware, so verification stays aligned with Clerk JWKS in `app.security.clerk_jwt` and test bypass headers.

## Database session

`get_db` / `get_tenant_db` sets transaction-scoped GUCs via `set_config(..., is_local=True)` in `app.db.rls_context` so PostgreSQL RLS policies apply without leaking tenant state across pooled connections. Pool **check-in** clears GUCs in `app.db.session`.

`get_admin_db` sets `app.is_admin` for operator routes (with `require_forge_operator`). `get_public_db` is an alias for unauthenticated sessions; public routes set org via slug before calling `set_active_organization`.

## Client IP

`app.core.ip.get_client_ip` uses `X-Forwarded-For` only when `TRUST_PROXY_HEADERS` is true **or** `ENVIRONMENT=test` (ASGI test clients). Production defaults avoid header spoofing.

## Errors

`ForgeError`, `HTTPException` with dict `detail` containing `code`, `RequestValidationError`, `IntegrityError`, `PayloadTooLarge`, and unhandled exceptions are mapped to JSON with `code`, `message`, `extra`, and `request_id` where applicable (`app.core.exception_handlers`).

## Adding middleware

- Insert new stack layers in `main.py` only, and document order here.
- Avoid importing `app.deps` from middleware modules (import cycles); keep header parsing duplicated as in `TenantMiddleware` vs `raw_active_organization_id`.

## OpenAPI → TypeScript

- Snapshot: `cd apps/api && uv run python scripts/export_openapi.py openapi.json`
- Codegen: `pnpm --filter web run codegen:api` → `apps/web/src/lib/api/schema.gen.ts`
- CI regenerates and diffs committed artifacts so API and web types stay aligned.
