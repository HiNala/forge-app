# Environments (dev / staging / production)

| Variable | Services | Purpose | If missing/wrong |
|----------|----------|---------|-------------------|
| `ENVIRONMENT` | api, worker | `development` / `staging` / `production` | Wrong logging/Sentry behavior |
| `DATABASE_URL` | api, worker | Async Postgres DSN | App does not start |
| `REDIS_URL` | api, worker | Queue + cache + rate limits | Worker down; API may degrade |
| `SECRET_KEY` | api | Signing (if used) | Rotate immediately if leaked |
| `BACKEND_CORS_ORIGINS` | api | Browser origins for API | Browser CORS failures |
| `APP_PUBLIC_URL` | api | Stripe redirects, invite links | Wrong redirect URLs |
| `API_BASE_URL` | api | OAuth callbacks | Google OAuth fails |
| `CLERK_*` / JWT | api | Auth | No sign-in |
| `OPENAI_API_KEY` (etc.) | api | LLM | Studio generation fails |
| `S3_*` / `STORAGE_*` | api | Uploads | Brand logo / files fail |
| `RESEND_API_KEY` | api, worker | Email | Automations email steps fail |
| `STRIPE_*` | api | Billing | Checkout/webhooks broken |
| `SENTRY_DSN` | api, web | Errors | No error tracking |
| `CADDY_INTERNAL_TOKEN` | api | Optional gate for `/internal/caddy/validate` | Leave empty on private network only |
| `WEB_UPSTREAM` | caddy | Private `host:port` for Next.js (e.g. `web.railway.internal:3000`) | Edge returns 502 |
| `CADDY_TLS_ASK_URL` | caddy | Full URL to `GET /internal/caddy/validate` (no query; Caddy appends `?domain=`) | Custom-domain TLS fails |
| `NEXT_PUBLIC_*` | web (build-time) | Browser API URL, app URL, Clerk publishable key, PostHog | Broken client config |
| `LLM_*` / provider keys | api, worker | Models, timeouts, fallbacks | Studio / section edit fails |
| `LLM_FALLBACK_MODELS` | api | Comma-separated fallback models | No failover when primary errors |
| `USE_AGENT_COMPOSER` | api | Expert composer path | Off in prod until validated |
| `STORAGE` / `S3_*` | api, worker | R2/S3 in production | Uploads and assets fail |
| `PORT` | api, web, caddy | Set by Railway | Wrong bind / health failures |
| `METRICS_TOKEN` | api | Optional; if set in **production**, `GET /metrics` needs `X-Metrics-Token` | Scrapes fail with 401 until header is configured |

**Caddy service:** set `WEB_UPSTREAM` and `CADDY_TLS_ASK_URL` in Railway; never commit real URLs to git.

**Production API boot:** `Settings` refuses `AUTH_TEST_BYPASS`, wildcard `TRUSTED_HOSTS`, missing `CLERK_JWKS_URL`, or non-empty `FORGE_E2E_TOKEN` — fix env before deploy.

Staging and production **must** use distinct secrets (`SECRET_KEY`, Stripe keys, Clerk instances as needed).
