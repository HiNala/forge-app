# Security implementation (MVP)

This document maps [PRD §11](../plan/02_PRD.md) controls to code and runbooks.

| Topic | Implementation |
|--------|----------------|
| **HTTPS** | Enforced at the edge (Railway / Caddy). Local dev uses HTTP; production URLs must be `https://`. |
| **Auth** | Clerk JWT (RS256) via JWKS; Bearer tokens validated in `app/security/clerk_jwt.py`. Session cookies are managed by Clerk on the web app (HttpOnly where Clerk configures them). |
| **Tenant isolation** | PostgreSQL RLS + `app.current_tenant_id` set per request; see `docs/runbooks/TENANT_ISOLATION.md`. |
| **Input validation** | Pydantic models on API bodies; public submit uses `normalize_submit_fields` + schema validation. |
| **Rate limiting** | `RateLimitMiddleware` — public `/p/.../track`, submit/upload, and authenticated API buckets; see `app/middleware/rate_limit.py`. |
| **SQL injection** | SQLAlchemy bound parameters only; raw SQL uses bound `:param` style. |
| **XSS (admin)** | Submissions and user text rendered as text / escaped in UI; do not `dangerouslySetInnerHTML` submission payloads. |
| **Stripe webhooks** | Signature verification via `STRIPE_WEBHOOK_SECRET`; idempotent processing in `stripe_events_processed`. |
| **Secrets** | Loaded from environment; never committed. Use `.env.example` as the template; rotate `SECRET_KEY` per environment. |
| **Error payloads** | Avoid logging or returning full PII; Sentry scrubbing in `app/core/sentry.py`. Production 500s return generic copy; `sentry_id` in `extra` when capture succeeds (`exception_handlers`). |
| **OpenAPI / docs** | When `ENVIRONMENT=production`, `/openapi.json`, `/docs`, `/redoc` are **disabled** (`app/main.py`). |
| **Prometheus `/metrics`** | In production, optional `METRICS_TOKEN`: if set, require header `X-Metrics-Token` (constant-time compare). `CORSMiddleware` allows `x-metrics-token` for browser-based tools; prefer scraping from a private network. |
| **Response headers (API)** | `SecurityHeadersMiddleware` — nosniff, `DENY` frame, referrer policy, permissions policy, HSTS in production. |
| **Response headers (web)** | `next.config.ts` `headers()` — same baseline + HSTS when `NODE_ENV=production`. |
| **Production boot checks** | `Settings` validator: `SECRET_KEY` min length 32 and not a known weak placeholder, no `AUTH_TEST_BYPASS`, `TRUSTED_HOSTS` not `*`, `CLERK_JWKS_URL` set, `FORGE_E2E_TOKEN` empty (`app/config.py`). |

**Planned / partial:** CSP on generated public HTML (inject via public runtime), full file-upload AV scan, CSRF on mutating routes where cookies are used without Bearer (Clerk primarily uses Bearer from Next.js).
