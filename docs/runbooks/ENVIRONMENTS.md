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

Staging and production **must** use distinct secrets (`SECRET_KEY`, Stripe keys, Clerk instances as needed).
