# Mission GL-04 — Railway deployment (report)

**Purpose:** Reproducible Railway-oriented configuration, env documentation, CI deploy hooks, and runbooks. **Live** `forge.app` / DNS / Stripe live keys / monitoring require operator access (Railway token, DNS, providers) and are recorded below when completed.

## Delivered in repository

| Area | Artifacts |
|------|-----------|
| Env template | Root `.env.example` (aligned with `apps/api/app/config.py` + Next `NEXT_PUBLIC_*`) |
| Worker Railway template | `railway.worker.json` (repo root) + `infra/railway.worker.json` (same intent: build `apps/worker/Dockerfile`) |
| Docker | `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/worker/Dockerfile`, `infra/caddy/Dockerfile` |
| Service configs | `apps/api/railway.json`, `apps/web/railway.json`, `infra/caddy/railway.json` |
| Audit | `scripts/deployment/audit_env.sh staging\|production` — compares `.env.example` keys to `railway variables` when CLI + `RAILWAY_TOKEN` are available |
| CI | `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-production.yml` (replaces single `deploy-railway.yml`) |
| Docs | `docs/deployment/RAILWAY_SETUP.md`, `ENV_MANIFEST.md`, `DNS_SETUP.md`; `docs/runbooks/DEPLOYMENT.md`, `GO_LIVE_PLAYBOOK.md`, `DISASTER_RECOVERY.md`, `INCIDENT_RESPONSE.md`; `docs/LAUNCH_CHECKLIST.md` |

## Operator-run (cannot finish from git alone)

- Railway project, environments, Postgres/Redis plugins, private networking, GitHub service links.
- All secrets (`railway variables` / dashboard).
- DNS at Cloudflare/Porkbun/etc.; ACME / TLS verification.
- Stripe live webhook URL and signing secret; Resend domain; Google OAuth production client.
- Sentry projects, uptime checks, log drains, on-call tooling.

## Go-live record

| Field | Value |
|-------|--------|
| GL-03 green candidate SHA | _TBD_ |
| First production deploy SHA | _TBD_ |
| Date / time (UTC) | _TBD_ |
| Live URLs | `https://forge.app`, `https://staging.forge.app` (when live) |

## GitHub Actions secrets (reference)

| Secret | Used by |
|--------|---------|
| `RAILWAY_TOKEN` | deploy-staging, deploy-production |
| `RAILWAY_SERVICE_ID_STAGING` | deploy-staging (`railway up`) |
| `RAILWAY_SERVICE_ID_PRODUCTION` | deploy-production |
| `STAGING_BASE_URL` / `PRODUCTION_BASE_URL` | optional post-deploy `curl` smoke |

## Follow-ups

- Wire Playwright staging smoke into `deploy-staging` once `STAGING_BASE_URL` + test credentials are stable.
- Add Sentry release + source maps upload on deploy.
- Optional: Grafana / OTEL push for `/metrics` (see mission Phase 13).
