# Environment variable manifest (GL-04)

Authoritative names live in `.env.example` (root) and `apps/api/app/config.py`. Values here describe **service placement** on Railway; set secrets only via CLI or dashboard, never in Git.

| Variable | Description | Services | Sensitivity | Staging / prod pattern |
|----------|-------------|----------|-------------|-------------------------|
| `NEXT_PUBLIC_API_URL` | Browser-facing API base (`.../api/v1`) | web (build-time) | config | `https://api-staging.forge.app/api/v1` / `https://api.forge.app/api/v1` |
| `NEXT_PUBLIC_APP_URL` | Public web origin | web (build-time) | config | `https://staging.forge.app` / `https://forge.app` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key | web | config | staging vs prod projects |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host | web | config | usually `https://us.i.posthog.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | web | config | staging vs prod Clerk instances |
| `NEXT_PUBLIC_FORGE_OPERATOR_ORG_IDS` | Operator org UUIDs for in-app admin templates | web | config | same as `FORGE_OPERATOR_ORG_IDS` |
| `ENVIRONMENT` | `development` / `staging` / `production` | api, worker | config | `staging` / `production` |
| `DATABASE_URL` | Async SQLAlchemy URL | api, worker | secret | `${{postgres.DATABASE_URL}}` reference |
| `REDIS_URL` | Redis URL | api, worker | secret | `${{redis.REDIS_URL}}` reference |
| `SECRET_KEY` | App signing / sessions | api | secret | `openssl rand -hex 32` (≥32 chars; known placeholders rejected when `ENVIRONMENT=production`) |
| `BACKEND_CORS_ORIGINS` | Allowed browser origins (JSON array or CSV) | api | config | prod/staging app URLs |
| `CORS_ORIGINS_EXTRA` | Extra origins (comma-separated) | api | config | previews, extra domains |
| `TRUST_PROXY_HEADERS` | Trust `X-Forwarded-*` from edge | api | config | `true` behind Caddy/Railway |
| `TRUSTED_HOSTS` | Allowed `Host` header values (comma-separated) | api | config | never `*` in production |
| `APP_ROOT_DOMAIN` | Canonical app hostname for domain flows | api | config | e.g. `forge.app` |
| `ALLOW_ORG_QUERY_PARAM` | `?org=` tenant switch | api | config | `false` in production |
| `FORCE_RATE_LIMIT_IN_TESTS` | Enable 429 paths in pytest | api | config | `false` in deployed envs |
| `APP_PUBLIC_URL` | Links in emails, Stripe return URLs | api, worker | config | public web URL |
| `UPGRADE_URL` | Billing upgrade deep link | api | config | `/settings/billing` on app URL |
| `CADDY_INTERNAL_TOKEN` | Shared secret for `/internal/caddy/validate` | api, caddy | secret | random string; match on both |
| `CLERK_JWKS_URL` | Clerk JWKS URL | api | config | from Clerk dashboard |
| `CLERK_JWT_ISSUER` | Expected JWT issuer | api | config | Clerk instance |
| `CLERK_AUDIENCE` | Optional audience | api | config | if used |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing | api | secret | per environment |
| `LLM_*` / provider keys | Router + models (see `config.py`) | api, worker | secret / config | staging keys vs live keys |
| `USE_AGENT_COMPOSER` | Expert composer agents | api | config | `true` when ready in prod |
| `OPENAI_API_KEY` | OpenAI | api, worker | secret | |
| `ANTHROPIC_API_KEY` | Anthropic | api, worker | secret | |
| `GOOGLE_API_KEY` | Gemini / Google AI | api, worker | secret | |
| `S3_ENDPOINT` | Object storage endpoint | api, worker | config | R2 or MinIO |
| `S3_BUCKET` | Bucket name | api, worker | config | `forge-staging` / `forge-production` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Credentials | api, worker | secret | |
| `S3_REGION` | Region id | api, worker | config | e.g. `auto` for R2 |
| `PUBLIC_ASSET_BASE_URL` | Public URL prefix for assets | api | config | CDN or bucket public URL |
| `RESEND_API_KEY` | Email API | api, worker | secret | |
| `RESEND_WEBHOOK_SECRET` | Resend signing | api | secret | |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` | From / reply | api | config | verified domains |
| `API_BASE_URL` | OAuth callbacks & webhooks base | api | config | `https://api...` |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` | Calendar OAuth | api | secret | per environment redirect URIs |
| `STRIPE_SECRET_KEY` | Stripe API | api | secret | test vs live |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook | api | secret | per webhook endpoint |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_STARTER` | Price IDs | api | config | test vs live products |
| `FORGE_OPERATOR_ORG_IDS` | Internal operator orgs | api | config | UUID list |
| `SENTRY_DSN` | Error tracking | api, worker, web | secret | separate DSNs per service optional |
| `METRICS_TOKEN` | Gate `GET /metrics` in production | api | secret | recommended in production; if unset, `/metrics` is public (see startup log warning) |
| `LOG_LEVEL` | Logging | api, worker, web | config | `info` / `warning` |

**Railway-only (commonly set by platform):** `PORT`, `RAILWAY_*`.

**Derived in app (not always in `.env.example`):** see `Settings` in `apps/api/app/config.py` for the full list (e.g. `CLERK_JWKS_URL` from Clerk, `TRUSTED_HOSTS`, quota limits).
