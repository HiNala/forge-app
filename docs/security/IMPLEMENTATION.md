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
| **Error payloads** | Avoid logging or returning full PII; Sentry scrubbing should be configured in production. |

**Planned / partial:** CSP on generated public HTML (inject via public runtime), full file-upload AV scan, CSRF on mutating routes where cookies are used without Bearer (Clerk primarily uses Bearer from Next.js).
