# Mission BI-02 — Middleware, Tenant Context & Request Routing (report)

**Branch:** `mission-bi-02-middleware-routing`  
**Status:** Complete (verified 2026-04-19)

## Summary

The Forge API already implemented most of BI-02 (request context, structlog, middleware stack, tenant resolution in dependencies, RLS session GUCs, rate limiting, health, metrics). This mission **hardened and documented** the pipeline: unified HTTP error JSON, Sentry wiring, trusted proxy policy for client IP, admin DB dependency, streaming body limit, OpenAPI snapshot + TypeScript codegen in CI, expanded tests, and runbook updates.

## Delivered

| Area | Implementation |
|------|----------------|
| Request context | `app.core.context.RequestContext` + `RequestContextMiddleware` |
| Logging | structlog JSON/console; `user_id` / `organization_id` bound in `get_db` |
| Middleware order | Documented and asserted in `tests/test_middleware_chain.py` |
| CORS | `settings.effective_cors_origins()` — `BACKEND_CORS_ORIGINS` + `CORS_ORIGINS_EXTRA`; CSV parsing for list env |
| Body size | Content-Length + chunked receive cap; `PayloadTooLarge` + 413 handler |
| Rate limits | Redis + in-process fallback; `FORCE_RATE_LIMIT_IN_TESTS` for 429 tests; `get_client_ip` |
| Auth | Clerk JWKS + optional Redis `jti` revocation list |
| Tenant | Header / subdomain / `?org=` (non-prod) / single-org default; `require_tenant` / `optional_tenant` |
| DB | `get_tenant_db` / `get_db` with `set_is_admin` from `User.is_admin`; **`get_admin_db`** for `/api/v1/admin/*`; **`get_public_db`** alias |
| Errors | `forge_http_exception_handler` for dict `HTTPException` details; validation + integrity + generic handlers |
| Sentry | `app.core.sentry.init_sentry()` — header scrubbing |
| OpenAPI | `scripts/export_openapi.py`, committed `apps/api/openapi.json`, `pnpm --filter web run codegen:api` → `schema.gen.ts`; CI drift checks |
| Docs | `docs/architecture/REQUEST_PIPELINE.md`, `docs/runbooks/DEBUGGING_REQUESTS.md` |

## Checklist (Phases 1–13) — verified

| Phase | Status | Where |
|-------|--------|--------|
| 1 — Context + logging | ✅ | `app/core/context.py`, `RequestContextMiddleware`, `app/core/logging.py` |
| 2 — CORS, body, gzip, trusted host | ✅ | `main.py` — `CORSMiddleware`, `BodySizeLimitMiddleware`, `GZipMiddleware`, `TrustedHostMiddleware` |
| 3 — Rate limiting | ✅ | `app/middleware/rate_limit.py` (Redis + fallback; not slowapi — custom limits per mission) |
| 4 — Auth | ✅ | `app/deps/auth.py`, Clerk JWKS; skips public/webhook paths via dependencies |
| 5 — Tenant resolution + membership | ✅ | `app/deps/tenant.py`, `TenantMiddleware` UUID prime |
| 6 — DB session + RLS GUCs | ✅ | `app/deps/db.py`, `app/db/rls_context.py` — transaction-scoped `set_config(..., true)` ≡ BI-02 `SET LOCAL` intent |
| 7 — Router layout | ⚠️ | Routers under `app/api/v1/*` (not `app/routers/*`); behavior matches |
| 8 — Pydantic + OpenAPI + TS | ✅ | Routers + `scripts/export_openapi.py`; CI diffs `openapi.json` / `schema.gen.ts` |
| 9 — Error handling | ✅ | `app/core/errors.py`, `exception_handlers.py`, `tests/test_error_handling.py` |
| 10 — Health + metrics | ✅ | `/health/live`, `/health/ready`, `/health/deep`, `/metrics` |
| 11 — Sentry | ✅ | `app/core/sentry.py` |
| 12 — Tests | ✅ | `test_middleware_chain.py`, `test_bi02_middleware_tenant.py`, `test_rate_limit_force.py`, `test_error_handling.py`, `test_tenant_isolation.py`, `test_auth_bi03.py` |
| 13 — Docs | ✅ | `REQUEST_PIPELINE.md`, `DEBUGGING_REQUESTS.md`, this report |

## Deferred / follow-ups

- **Router package layout** under `app/routers/*` — current layout remains `app/api/v1/*`; large move deferred.
- **`FORGE_ADMIN_DATABASE_URL` BYPASSRLS pool** — setting reserved; admin routes use RLS + `app.is_admin` + operator org allowlist.
- **Membership Redis cache + pubsub invalidation** — optional (BI-04).
- **Coverage ratchet (85% middleware/core)** — not enforced in CI.
- **OpenTelemetry** — optional.

## Verification

```bash
cd apps/api && uv run ruff check . && uv run mypy app && uv run pytest
cd ../web && pnpm run typecheck && pnpm run lint
```
