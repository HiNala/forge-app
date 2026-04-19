# Mission BI-02 — Middleware, tenant context & routing (report)

**Branch:** `mission-bi-02-middleware-routing`  
**Status:** Implemented against existing Clerk + `deps` pattern (no duplicate JWT middleware layer).

## Delivered

- **`app/core/context.py`** — `RequestContext` + ContextVar; populated from tenant + user inside `get_db`.
- **`app/core/logging.py`** — structlog (console dev / JSON prod); `configure_logging()` at import in `main`.
- **`RequestContextMiddleware`** — `X-Request-ID`, structlog `http.request.*`, exposes header.
- **`BodySizeLimitMiddleware`**, **`GZipMiddleware`**, **`TrustedHostMiddleware`** (`TRUSTED_HOSTS`, default `*`).
- **CORS** — explicit methods + `expose_headers=["X-Request-ID"]`, allow headers for Forge + Clerk.
- **Rate limits** (Redis + fallback) — BI-02 defaults: 120/min per authenticated user, 10/min studio POST, dual bucket for public submit (5/min per IP + 30/min per page slug), 429 JSON `code=rate_limited`.
- **Tenant resolution** — headers `x-forge-active-org-id`, `x-forge-tenant-id`, `x-active-org`; optional `?org=` when `ALLOW_ORG_QUERY_PARAM` and not production; subdomain `slug.{APP_ROOT_DOMAIN}` resolves org by slug; **single membership defaults** active org; **multi-org without header → 400 `org_not_specified`** via `require_tenant`.
- **`get_tenant_db`** — alias of `get_db`; RLS GUCs use transaction-local `set_config` in `app.db.rls_context`.
- **`ForgeError`** + global handler — unified JSON with `request_id`.
- **Health** — `/health/live`, `/health/ready` (Postgres + Redis); `/health` legacy; `/metrics` (Prometheus text).
- **Docs** — `docs/architecture/REQUEST_PIPELINE.md`, `docs/runbooks/DEBUGGING_REQUESTS.md`, `docs/external/backend/fastapi-middleware.md`.
- **Tests** — `tests/test_bi02_middleware_tenant.py`.

## Deferred / follow-up

- **slowapi** — kept custom Redis limiter to avoid duplicate stacks; tuning in one module.
- **Full router re-packaging** under `app/routers/*` — out of scope; existing `app.api.v1` structure retained.
- **OpenAPI → TypeScript** in CI — run `pnpm dlx openapi-typescript http://localhost:8000/openapi.json …` locally or add a job when the web app pins generated types.
- **Sentry scrub** + **OpenTelemetry** — wire when `Sentry` initialization lands next to `configure_logging` (env-gated).
- **Membership cache + Redis pubsub invalidation** — not implemented; DB lookup per request remains acceptable at current scale.
