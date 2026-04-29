# Environment variable manifest (GL-04)

Authoritative names live in `.env.example` (root) and `apps/api/app/config.py`. Values here describe **service placement** on Railway; set secrets only via CLI or dashboard, never in Git.

| Variable | Description | Services | Sensitivity | Staging / prod pattern |
|----------|-------------|----------|-------------|-------------------------|
| `NEXT_PUBLIC_API_URL` | Browser-facing API base (`.../api/v1`) | web (build-time) | config | `https://api-staging.glidedesign.ai/api/v1` / `https://api.glidedesign.ai/api/v1` |
| `NEXT_PUBLIC_APP_URL` | Public web origin | web (build-time) | config | `https://staging.glidedesign.ai` / `https://app.glidedesign.ai` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key | web | config | staging vs prod projects |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host | web | config | usually `https://us.i.posthog.com` |
| `NEXT_PUBLIC_GLIDEDESIGN_OPERATOR_ORG_IDS` / `NEXT_PUBLIC_FORGE_OPERATOR_ORG_IDS` | Operator org UUIDs for in-app admin templates | web | config | same as `GLIDEDESIGN_OPERATOR_ORG_IDS` |
| `ENVIRONMENT` | `development` / `staging` / `production` | api, worker | config | `staging` / `production` |
| `DATABASE_URL` | Async SQLAlchemy URL | api, worker | secret | `${{postgres.DATABASE_URL}}` reference |
| `REDIS_URL` | Redis URL | api, worker | secret | `${{redis.REDIS_URL}}` reference |
| `SECRET_KEY` | App fallback secret | api | secret | random 32+ bytes |
| `AUTH_JWT_SECRET` | First-party auth JWT signing secret | api | secret | random 32+ bytes; rotate by forcing sign-in |
| `AUTH_JWT_ISSUER` / `AUTH_JWT_AUDIENCE` | First-party JWT validation claims | api | config | `glidedesign-api` / `glidedesign-web` |
| `BACKEND_CORS_ORIGINS` | Allowed browser origins (JSON array or CSV) | api | config | prod/staging app URLs |
| `CORS_ORIGINS_EXTRA` | Extra origins (comma-separated) | api | config | previews, extra domains |
| `TRUST_PROXY_HEADERS` | Trust `X-Forwarded-*` from edge | api | config | `true` behind Caddy/Railway |
| `FORCE_RATE_LIMIT_IN_TESTS` | Enable 429 paths in pytest | api | config | `false` in deployed envs |
| `APP_PUBLIC_URL` | Links in emails, Stripe return URLs | api, worker | config | public web URL |
| `UPGRADE_URL` | Billing upgrade deep link | api | config | `/settings/billing` on app URL |
| `CADDY_INTERNAL_TOKEN` | Shared secret for `/internal/caddy/validate` | api, caddy | secret | random string; match on both |
| `LLM_*` / provider keys | Router + models (see `config.py`) | api, worker | secret / config | staging keys vs live keys |
| `USE_PRODUCT_ORCHESTRATOR` | Ten-agent product/design orchestration | api | config | default `true`; set `false` only for legacy fallback |
| `USE_AGENT_COMPOSER` | Expert composer agents | api | config | `true` when ready in prod |
| `OPENAI_API_KEY` | OpenAI | api, worker | secret | |
| `ANTHROPIC_API_KEY` | Anthropic | api, worker | secret | |
| `GOOGLE_API_KEY` | Gemini / Google AI | api, worker | secret | |
| `S3_ENDPOINT` | Object storage endpoint | api, worker | config | R2 or MinIO |
| `S3_BUCKET` | Bucket name | api, worker | config | `glidedesign-staging` / `glidedesign-production` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Credentials | api, worker | secret | |
| `S3_REGION` | Region id | api, worker | config | e.g. `auto` for R2 |
| `PUBLIC_ASSET_BASE_URL` | Public URL prefix for assets | api | config | CDN or bucket public URL |
| `RESEND_API_KEY` | Email API | api, worker | secret | |
| `RESEND_WEBHOOK_SECRET` | Resend signing | api | secret | |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` | From / reply | api | config | verified domains |
| `API_BASE_URL` | OAuth callbacks & webhooks base | api | config | `https://api...` |
| `GOOGLE_AUTH_CLIENT_ID` / `SECRET` | Google login OAuth (`openid email profile`) | api | secret | redirect `/api/v1/auth/oauth/google/callback` |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` | Calendar OAuth | api | secret | redirect `/api/v1/calendar/callback/google` |
| `STRIPE_SECRET_KEY` | Stripe API | api | secret | test vs live |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook | api | secret | per webhook endpoint |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_STARTER` | Price IDs | api | config | test vs live products |
| `GLIDEDESIGN_OPERATOR_ORG_IDS` / `FORGE_OPERATOR_ORG_IDS` | Internal operator orgs | api | config | UUID list |
| `SENTRY_DSN` | Error tracking | api, worker, web | secret | separate DSNs per service optional |
| `LOG_LEVEL` | Logging | api, worker, web | config | `info` / `warning` |

**Railway-only (commonly set by platform):** `PORT`, `RAILWAY_*`.

Legacy `FORGE_*` names are preserved where they are internal contracts or deployed environment compatibility points. Prefer the `GLIDEDESIGN_*` aliases for new deployments when both are available.

**Derived in app (not always in `.env.example`):** see `Settings` in `apps/api/app/config.py` for the full list (e.g. `TRUSTED_HOSTS`, quota limits).
