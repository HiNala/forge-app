# Mission 08 — Railway deployment & go-live (report)

**Branch:** `mission-08-railway-deploy`  
**Status:** Repository and CI/CD scaffolding **ready**; cloud provisioning, DNS, and live verification are **operator tasks** in Railway / DNS / third-party dashboards.

## Completed in-repo

| Item | Notes |
|------|--------|
| API boot migrations | `apps/api/railway.json` `startCommand` runs `alembic upgrade head` then Uvicorn. |
| Caddy edge config | `infra/caddy/Caddyfile` — `on_demand_tls`, `forge.app` / `www` redirect / `*.forge.app`, custom-domain `:443` block, env `WEB_UPSTREAM` + `CADDY_TLS_ASK_URL`. |
| Caddy validate API | Existing `GET /internal/caddy/validate` + `forge_caddy_domain_allowed()` migration. |
| Staging deploy workflow | `.github/workflows/deploy-staging.yml` triggers on **successful** `CI` run on `main` or `workflow_dispatch`; optional `STAGING_API_URL` smoke. |
| Production deploy workflow | `.github/workflows/deploy-production.yml` — confirm gate, optional `PRODUCTION_API_URL` + `/health/deep` smoke. |
| Runbooks | `docs/runbooks/DEPLOYMENT.md`, `ROLLBACK.md`, `INCIDENT_RESPONSE.md`, `ONCALL.md`, `DATABASE.md`, `LLM_OUTAGE.md`, `FIRST_PRODUCTION_BUG.md`, `ENVIRONMENTS.md`, `MIGRATIONS.md`, `COST_MODEL.md`, `EMAIL.md` — reviewed/updated where noted below. |
| External docs | `docs/external/infrastructure/caddy-reverse-proxy.md` aligned with `/internal/caddy/validate`. |
| Railway setup | `docs/deployment/RAILWAY_SETUP.md` updated for Mission 08 CI + migrations. |
| SEO | `apps/web/src/app/robots.ts` and `sitemap.ts` already disallow app routes and `/p/`; marketing paths in sitemap. |

## Operator checklist (not verifiable in git)

These **must** be done in Railway, Stripe, Clerk, Resend, Google Cloud Console, DNS, BetterStack/Instatus, etc.:

1. Railway project with **dev / staging / production** environments and services: **web**, **api**, **worker**, **caddy**, Postgres 16, Redis 7; object storage on **R2 or S3** (not MinIO in prod).
2. **Private networking** for `DATABASE_URL`, `REDIS_URL`, upstreams `web.railway.internal`, `api.railway.internal`.
3. Per-env **secrets** (`SECRET_KEY` unique per env), live Stripe, Resend domain, production Clerk, Google OAuth redirect URIs, Sentry/PostHog DSNs.
4. **DNS** — `forge.app`, `www`, `api`, `*.forge.app`, `staging`, `status` per `docs/deployment/DNS_SETUP.md` (if present) or `DEPLOYMENT.md`.
5. **Public entry** — attach Railway public hostname to **Caddy**, not directly to `web`, when using custom domains + on-demand TLS.
6. **Alerting** — Sentry alerts, Railway/log-based alerts, Stripe webhook failure notifications, LLM budget caps, Postgres disk (per runbooks).
7. **Backups** — daily `pg_dump` to R2/S3, 30-day retention, **restore tested** monthly (`DATABASE.md`).
8. **GitHub Environments** — `staging` and `production` with required reviewers on `production`.
9. **GitHub Secrets** — `RAILWAY_TOKEN`, service IDs, `STAGING_BASE_URL`, `STAGING_API_URL`, `PRODUCTION_BASE_URL`, `PRODUCTION_API_URL`.
10. **Dogfood org** — seed Digital Studio Labs org with Brian as Owner in **production** (SQL/admin tool; not automated in repo).
11. **Status page** — `status.forge.app` → provider of choice.

## Deferred / follow-up

- **Caddy `ask` + `CADDY_INTERNAL_TOKEN`:** API supports the header; adding it to Caddy’s outbound `ask` request may need a small Caddy plugin or wrapper — rely on private network until then.
- **Railway cron** for pg_partman / dumps — implement via Railway cron or worker `arq` cron; document in `WORKER.md` / `DATABASE.md` when scheduled.
- **LLM daily budget alert** — provider dashboards + future per-tenant hard caps in app config.
- **Smoke: sign-in + Studio** in GitHub Actions requires stable E2E credentials and secrets; currently workflows only `curl` health and home.

## Post-launch cadence (suggested)

- Weekly: review Dependabot, Sentry noise, Railway costs.
- Monthly: backup restore drill, RLS / security checklist sample.
- Per incident: `INCIDENT_RESPONSE.md` + post-mortem template in `FIRST_PRODUCTION_BUG.md`.

## References

- `docs/LAUNCH_CHECKLIST.md`
- `docs/runbooks/GO_LIVE_PLAYBOOK.md`
- `docs/external/infrastructure/railway-deployment.md`
