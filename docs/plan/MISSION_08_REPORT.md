# Mission 08 — Railway Deployment & Go-Live (report)

**Branch:** `mission-08-railway-deploy`  
**Date:** 2026-04-19

## What was implemented in-repo

| Area | Deliverable |
|------|-------------|
| **Caddy TLS gate** | `GET /internal/caddy/validate?domain=` on the API; DB function `forge_caddy_domain_allowed(hostname)` (SECURITY DEFINER); table `custom_domains` + RLS; optional `CADDY_INTERNAL_TOKEN` + `X-Forge-Caddy-Token`. |
| **Infra** | `infra/caddy/Dockerfile`, `infra/caddy/Caddyfile` (commented reference), root `infra/railway.json` template. |
| **Web** | `next.config.ts` sets `output: "standalone"` for Docker deploys. |
| **Tests** | `tests/test_caddy_internal.py` (Postgres). |
| **CI** | `.github/workflows/deploy-staging.yml` / `deploy-production.yml` — **optional** Railway CLI deploy when secrets are set; GitHub-linked Railway builds remain primary. |
| **Runbooks** | [ENVIRONMENTS.md](../runbooks/ENVIRONMENTS.md), [DEPLOYMENT.md](../runbooks/DEPLOYMENT.md), [ROLLBACK.md](../runbooks/ROLLBACK.md), [DATABASE.md](../runbooks/DATABASE.md), [MIGRATIONS.md](../runbooks/MIGRATIONS.md), [COST_MODEL.md](../runbooks/COST_MODEL.md), [LLM_OUTAGE.md](../runbooks/LLM_OUTAGE.md), [FIRST_PRODUCTION_BUG.md](../runbooks/FIRST_PRODUCTION_BUG.md), [ONCALL.md](../runbooks/ONCALL.md); extended [INCIDENT_RESPONSE.md](../runbooks/INCIDENT_RESPONSE.md). |

## What must be done in Railway / DNS (not verifiable from git)

Brian’s team must: create the Railway project and services; set **staging** and **production** env vars; attach **forge.app** DNS; configure **Stripe live** webhooks; verify **Resend** domain; enable **Sentry** production projects; add **status page**; run the **pre-launch checklist** (Mission 08 Phase 10); perform **smoke tests** and **backup restore** drills.

## Verification commands (local / CI)

```bash
cd apps/api && uv run alembic upgrade head && uv run ruff check app && uv run mypy app && uv run pytest
cd apps/web && pnpm run lint && pnpm run typecheck
```

## Prerequisites for Mission 09+

Production should be stable on Railway with monitoring before expanding templates/marketplace work.
