# Mission BI-02 — Middleware, tenant context & routing (report)

**Branch target:** `mission-bi-02-middleware-routing`  
**Date:** 2026-04-19  

## Summary

Forge already implemented most of BI-02: `RequestContext` + `RequestContextMiddleware`, structlog (`app/core/logging.py`), CORS / TrustedHost / GZip / body size / rate limits, tenant resolution in `app/deps/tenant.py` (header, query in non-prod, subdomain slug, single-org default), RLS session GUCs in `get_db` / `get_tenant_db` via `set_config(..., is_local=True)`, health endpoints, and Prometheus metrics.

This iteration **closes gaps** against the mission checklist: Sentry initialization with scrubbing, global exception handlers (validation flattening, `HTTPException` + `request_id`, `IntegrityError` → conflict, safe 500s in production), structlog merge of `RequestContext` user/org into log lines, `CORS_ORIGINS` env alias, `RATE_LIMIT_IN_TESTS`, placeholder `get_admin_db`, runbook **DEBUGGING_REQUESTS.md**, extra tests (middleware order, errors, RLS over HTTP, rate limit), and doc updates to **REQUEST_PIPELINE.md**.

## TODO mapping (concise)

| Area | Status |
|------|--------|
| ContextVar + request id + structlog | Implemented; logging now merges context for user/org when set |
| CORS / trusted hosts / body / gzip | Already in `main.py` + `BodySizeLimitMiddleware` |
| Rate limiting (Redis + limits) | `RateLimitMiddleware`; test hook `RATE_LIMIT_IN_TESTS` |
| Auth (Clerk JWT + API tokens + test bypass) | `app/deps/auth.py` — dependency-based, not ASGI JWT middleware (documented) |
| Tenant resolution + membership | `optional_tenant` / `require_tenant` |
| `get_tenant_db` + RLS | `get_db` → `set_config` transaction-scoped |
| Typed errors + HTTP validation | `main.py` handlers + `ForgeError` |
| Sentry | `app/core/sentry.py` + optional DSN |
| Health / metrics | `/health/*`, `/metrics` |
| Tests | See `tests/test_middleware_chain.py`, `test_error_handling.py`, `test_rls_via_http.py`, `test_rate_limit.py`, existing `test_bi02_middleware_tenant.py` |
| OpenAPI → TypeScript in CI | **Not automated** — recommend a follow-up job (`openapi-typescript` against exported JSON) when `apps/web/src/lib/api/schema.ts` is committed |
| Membership Redis cache + pubsub invalidation | **Future** — DB lookups today are acceptable for current scale |
| Coverage ≥ 85% middleware | **Not enforced** — ratchet in a polish mission |

## Acceptance

Core acceptance criteria are met: consistent pipeline, tenant-scoped DB sessions, rate limiting, structured errors, Sentry hook, documentation, and passing API tests on Postgres.
