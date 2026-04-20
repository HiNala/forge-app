# Production launch checklist

Use this when the API and web app are exposed on the public internet (Railway, Kubernetes, VM + reverse proxy, etc.).

## Environment

1. **`ENVIRONMENT=production`** — enables strict `Settings` validation (`app/config.py`): strong `SECRET_KEY` (≥32 chars, not a known placeholder), `TRUSTED_HOSTS` not `*`, `CLERK_JWKS_URL` + **`CLERK_JWT_ISSUER`**, **`APP_PUBLIC_URL`** and **`API_BASE_URL`** must be **`https://`**, CORS origins must be **`https://`** (no wildcard), `AUTH_TEST_BYPASS=false`, **`FORGE_E2E_TOKEN` empty**.
2. **Clerk** — Production instance keys; **`CLERK_WEBHOOK_SECRET`** for `POST /api/v1/auth/webhook`.
3. **TLS** — Terminate HTTPS at the edge (Caddy, Railway, ALB, Cloudflare). The API adds **HSTS** response headers when `ENVIRONMENT=production`.
4. **`TRUST_PROXY_HEADERS=true`** when the app sits behind a trusted reverse proxy so **`X-Forwarded-For`** is used for rate limiting and IP logging (see startup warning if false).

## Observability and ops

5. **`METRICS_TOKEN`** — Set so `GET /metrics` requires header **`X-Metrics-Token`** in production. If unset, `/metrics` is unauthenticated (avoid on public URLs).
6. **`SENTRY_DSN`** — Recommended for error tracking.
7. **Database** — Use a non-superuser role (**`forge_app`**) in production so RLS cannot be bypassed; see `docs/runbooks/TENANT_ISOLATION.md` and `docs/architecture/MULTI_TENANCY.md`.
8. **Redis** — Required for rate limits and queues at scale; health checks treat missing Redis as degraded but non-fatal for `/health/ready` in some setups—confirm for your SLO.

## Health endpoints

9. **`/health/live`** — Liveness.
10. **`/health/ready`** — Postgres + Redis.
11. **`/health/deep`** — Same core checks; **integration flags** (Stripe/Resend/OpenAI configured) are **omitted in production** to avoid minor information disclosure.

## Internal-only routes

12. **`GET /internal/caddy/validate`** — Intended for Caddy **on-demand TLS** over a **private** network; set **`CADDY_INTERNAL_TOKEN`** if the route could be reached from untrusted networks.

## Secrets

13. Rotate **`SECRET_KEY`**, DB passwords, **`CADDY_INTERNAL_TOKEN`**, **`METRICS_TOKEN`**, and provider keys per environment; never reuse dev secrets in production.

## Web (Next.js)

14. **`NODE_ENV=production`** for the built app (Dockerfile / host process).
15. **`NEXT_PUBLIC_*`** — only non-secret values; never put API keys in `NEXT_PUBLIC_` vars.
16. **Robots / SEO** — `src/app/robots.ts` disallows app-shell and API routes from crawlers; **`src/app/sitemap.ts`** uses `SITE_URL` / `NEXT_PUBLIC_SITE_URL` for marketing URLs. Set the site URL correctly for your domain.

## Webhooks (billing & email)

17. **`STRIPE_WEBHOOK_SECRET`** — must match the signing secret for `POST /api/v1/billing/webhook` in the Stripe dashboard (live mode for production).
18. **`RESEND_WEBHOOK_SECRET`** — if you use Resend inbound/webhooks, verify signatures the same way.
19. **`CLERK_WEBHOOK_SECRET`** — required for user lifecycle sync at `POST /api/v1/auth/webhook`.

## After deploy

20. Smoke-test sign-in, one API call with **`x-forge-active-org-id`**, and a published page if applicable.
21. Confirm **Stripe** webhooks point at the production API URL and **Resend** domain is verified.

See also: **`TENANT_ISOLATION.md`**, **`docs/plan/11_MISSION_08_RAILWAY_DEPLOY.md`**.
