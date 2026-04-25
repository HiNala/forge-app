# GO-LIVE MISSION GL-04 — Railway Deployment via CLI, End-to-End

**Goal:** Take the "go-live green" build identified at the end of GL-03 and ship it to production on Railway. Every provisioning step, every configuration toggle, every DNS record, every secret, every CI pipeline wiring — done by the coding agent via the Railway CLI and scripted Terraform-adjacent operations so Brian doesn't have to click through dashboards. After this mission, Forge is live at `forge.app` with staging at `staging.forge.app`, both environments are monitored, CI deploys on merge to main (staging auto, production manual-approval), custom-domain TLS works via Caddy's on-demand issuance, Stripe is configured with live keys, and a full rollback procedure is documented and exercised.

**Branch:** `mission-gl-04-railway-deploy`
**Prerequisites:** GL-01, GL-02, GL-03 all complete. "Go-live green" candidate build identified. User has signed up for Railway, grabbed an API token, and shared it (via the RAILWAY_TOKEN environment variable available to the agent). Domain `forge.app` is owned by the user and controllable via their DNS provider (Cloudflare, Porkbun, or equivalent — the user should share DNS API credentials if possible; if not, the mission produces a DNS instruction doc for manual entry).
**Estimated scope:** Medium-large. The mission is mostly shell scripting + Railway CLI + verification, but the dependency graph (DNS → TLS → service health → Stripe webhook registration) has to be walked in order with verification at each step.

---

## Experts Consulted On This Mission

- **Linus Torvalds** — *Boring deployment is good deployment. Be conservative; automate ruthlessly.*
- **Ken Thompson / Dennis Ritchie** — *Configuration belongs in code. If someone clicks it in the dashboard, document it and script it.*
- **Jef Raskin** — *The deployment process should have zero modes. Either it works end-to-end, or the failure point is obvious.*
- **Railway 2026 monorepo patterns** — *Isolated monorepo with per-service root directories, watch paths to avoid unnecessary rebuilds, Nixpacks for simple services + Dockerfiles where the build needs custom logic.*

---

## How To Run This Mission

The coding agent drives this via the Railway CLI. Install pattern:

```bash
curl -fsSL https://railway.com/install.sh | sh
railway login --browserless  # uses RAILWAY_TOKEN
```

Forge's service topology on Railway:

```
┌─────────────────────────────── Railway Project: forge-prod ──────────────────────────────┐
│                                                                                           │
│  caddy         ← public ingress, TLS, on-demand cert issuance for custom domains         │
│   ├─ web       ← Next.js app (apps/web)                                                  │
│   ├─ api       ← FastAPI (apps/api)                                                      │
│   └─ p         ← public-page renderer (API serves, but Caddy routes /p/* directly)       │
│                                                                                           │
│  worker        ← arq background job processor (apps/api, different start command)        │
│                                                                                           │
│  Plugins:                                                                                 │
│   postgres     ← managed Postgres 16 w/ pgcrypto, pg_partman, btree_gist                 │
│   redis        ← managed Redis 7                                                          │
│                                                                                           │
│  External object storage: Cloudflare R2 (cheaper egress than Railway S3) via presigned    │
│  URLs. Credentials as Railway env vars.                                                   │
│                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

Environments: `production` and `staging`. Same topology, separate Postgres/Redis instances, separate domains (`forge.app` vs `staging.forge.app`), separate Stripe keys (live vs test).

Commit on milestones: railway.json configs for each service, project created, services up, DB migrated, health green, Caddy routing correct, first real request served, CI wired, Stripe production keys live, runbooks written.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Pre-Deployment Checklist

1. Verify the "go-live green" build SHA from GL-03 is the tip of `main`. If not, resolve before starting.
2. Audit `.env.example` at the repo root — every production env var the app needs must be documented here with a description and example value. Secret values are obviously placeholders. The CI bootstrap script (Phase 7) will fail if any variable in `.env.example` is missing from the Railway environment.
3. Audit Dockerfiles:
    - `apps/api/Dockerfile` — multi-stage (uv install in builder, copy into slim runtime). Exposes `$PORT`. Runs `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
    - `apps/api/Dockerfile.worker` — same base, different CMD (`arq app.worker.WorkerSettings`).
    - `apps/web/Dockerfile` — Next.js standalone output; multi-stage with pnpm. Exposes `$PORT`. Runs `node server.js`.
    - `infra/caddy/Dockerfile` — Caddy official image + custom Caddyfile for on-demand TLS and upstream routing.
    All Dockerfiles build green locally before we proceed.
4. Audit `railway.json` per service (or `railway.toml` if we prefer). One file per service at the service's root directory:
    ```json
    {
      "$schema": "https://railway.app/railway.schema.json",
      "build": { "builder": "DOCKERFILE", "dockerfilePath": "./Dockerfile" },
      "deploy": {
        "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
        "healthcheckPath": "/health/ready",
        "healthcheckTimeout": 60,
        "restartPolicyType": "ON_FAILURE",
        "restartPolicyMaxRetries": 3,
        "numReplicas": 1
      }
    }
    ```
    Each service gets its own appropriate variant.
5. Confirm `pgcrypto`, `pg_partman`, and `btree_gist` extensions are available on Railway's managed Postgres. If any aren't (pg_partman specifically can be hit-or-miss on managed providers), implement the fallback: run pg_partman as a cron-triggered Python job that issues the equivalent partition management SQL directly. Code this now as a branch fallback so we're not blocked at deploy time.

### Phase 2 — Railway Project Bootstrap

6. Install Railway CLI in the agent's environment:
    ```bash
    curl -fsSL https://railway.com/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
    railway --version  # verify
    ```
7. Authenticate with the user's token:
    ```bash
    railway login --browserless  # uses $RAILWAY_TOKEN
    ```
8. Create the project via CLI:
    ```bash
    railway init --name forge
    ```
    This creates the project linked to the current directory. Capture the project ID.
9. Create two environments:
    ```bash
    railway environment new production
    railway environment new staging
    railway environment use staging  # start with staging
    ```
10. **Decision: deploy method.** Two options:
    - **GitHub-linked** (Railway pulls from the repo on push). Cleaner. Requires linking GitHub; Railway handles builds. Recommended for prod.
    - **CLI-uploaded** (`railway up` uploads the current working directory). Useful for initial bootstrap and hot-fix deploys when Git is unavailable.
    Use GitHub-linked for both environments; keep CLI upload as a documented fallback.

### Phase 3 — Provision Plugins

11. Add Postgres to the staging environment:
    ```bash
    railway add --database postgres --service postgres
    ```
    The managed instance is provisioned. Railway injects `DATABASE_URL` automatically as a reference variable.
12. Add Redis:
    ```bash
    railway add --database redis --service redis
    ```
    `REDIS_URL` is injected.
13. Connect to staging Postgres and enable required extensions:
    ```bash
    railway connect postgres
    # then in psql:
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    CREATE EXTENSION IF NOT EXISTS pg_partman;  -- if not available, skip; fallback will handle
    ```
14. Repeat provisioning for the `production` environment.

### Phase 4 — Service Creation & Configuration

15. For each of the four services (web, api, worker, caddy), create the Railway service linked to the GitHub repo with the appropriate root directory:
    ```bash
    railway environment use staging
    railway service create --name api
    # In the Railway dashboard or via API, set:
    #   Source: GitHub repo
    #   Root directory: apps/api
    #   Watch paths: apps/api/**, packages/shared/**
    ```
    Railway's CLI has grown `railway service` commands over 2025-2026; if a setting isn't CLI-exposed, use `railway open` to jump to the dashboard and set it via UI, with the change committed to `railway.json`/`railway.toml` checked into the repo to make it reproducible.
16. Set root directories per service:
    - `api` → `apps/api`
    - `worker` → `apps/api` (different start command via railway.json override for the worker service)
    - `web` → `apps/web`
    - `caddy` → `infra/caddy`
17. Set watch paths (gitignore-style patterns) per service so a change to `apps/web/` doesn't rebuild the API and vice versa:
    - `api`: `apps/api/**`, `packages/shared/**`, `infra/docker/api.Dockerfile`
    - `worker`: same as api
    - `web`: `apps/web/**`, `packages/shared/**`
    - `caddy`: `infra/caddy/**`
18. For the worker service, override the start command via `railway.json`:
    ```json
    {
      "deploy": {
        "startCommand": "arq app.worker.WorkerSettings",
        "healthcheckPath": null,
        "restartPolicyType": "ON_FAILURE"
      }
    }
    ```
    Commit as `apps/api/railway.worker.json` and reference in Railway's service settings (the service uses a non-default config file).
19. For Caddy, Caddyfile:
    ```
    {
      on_demand_tls {
        ask http://api.railway.internal:8000/internal/caddy/validate
      }
    }
    
    # App domain
    forge.app, www.forge.app {
      reverse_proxy web.railway.internal
    }
    
    # API
    api.forge.app {
      reverse_proxy api.railway.internal:8000
    }
    
    # Public pages with custom domains (on-demand TLS)
    :443 {
      tls {
        on_demand
      }
      reverse_proxy api.railway.internal:8000/p{uri}
    }
    ```
    Uses Railway's internal private networking (`*.railway.internal`) for service-to-service calls — no public hops.

### Phase 5 — Environment Variables & Secrets

20. Compile the complete env-var manifest for each service. Document in `docs/deployment/ENV_MANIFEST.md` with:
    - Variable name
    - Description
    - Service(s) that need it
    - Sensitivity (secret/config)
    - Production vs staging value pattern
    - Source (Railway reference / hardcoded / Stripe / etc.)
21. Set shared environment variables at the Railway environment level (not per-service) so multiple services see them without duplication:
    ```bash
    railway variables set ENVIRONMENT=staging
    railway variables set LOG_LEVEL=info
    railway variables set FORGE_BASE_URL=https://staging.forge.app
    railway variables set API_BASE_URL=https://api-staging.forge.app
    # ... and more
    ```
22. Use Railway's reference variables for DB/Redis:
    ```bash
    railway variables set DATABASE_URL='${{postgres.DATABASE_URL}}'
    railway variables set REDIS_URL='${{redis.REDIS_URL}}'
    ```
    (Railway supports variable interpolation via `${{service.VARIABLE}}` syntax.)
23. Secrets — never checked into the repo. Set via CLI:
    ```bash
    railway variables set OPENAI_API_KEY=$OPENAI_API_KEY_STAGING --service api --service worker
    railway variables set ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY_STAGING --service api --service worker
    railway variables set GOOGLE_API_KEY=$GOOGLE_API_KEY_STAGING --service api --service worker
    railway variables set STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY_STAGING --service api
    railway variables set STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET_STAGING --service api
    railway variables set RESEND_API_KEY=$RESEND_API_KEY_STAGING --service api --service worker
    railway variables set CLERK_SECRET_KEY=$CLERK_SECRET_KEY_STAGING --service api
    railway variables set INTEGRATION_ENCRYPTION_KEY=$(openssl rand -base64 32) --service api --service worker
    railway variables set JWT_SIGNING_KEY=$(openssl rand -base64 64) --service api
    railway variables set SENTRY_DSN=$SENTRY_DSN_STAGING --service api --service worker --service web
    railway variables set R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID --service api --service worker
    railway variables set R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY --service api --service worker
    railway variables set R2_BUCKET=forge-staging --service api --service worker
    railway variables set R2_ENDPOINT=$R2_ENDPOINT --service api --service worker
    railway variables set GOOGLE_OAUTH_CLIENT_ID=$GOOGLE_OAUTH_CLIENT_ID_STAGING --service api
    railway variables set GOOGLE_OAUTH_CLIENT_SECRET=$GOOGLE_OAUTH_CLIENT_SECRET_STAGING --service api
    # ... etc
    ```
24. Repeat all env setup for the `production` environment with production-grade values (live Stripe keys, production Sentry DSN, different R2 bucket, etc.).
25. Run a secrets-audit script that compares `.env.example` against the actual Railway variables set per environment. Any variable in `.env.example` missing from Railway fails the audit. The script is reusable: `scripts/deployment/audit_env.sh staging|production`.

### Phase 6 — First Deployment (Staging)

26. Trigger the first deployment for each service. Because services are GitHub-linked, pushing the `main` branch is sufficient — but we do it explicitly via CLI to confirm:
    ```bash
    railway environment use staging
    railway service use api
    railway up --detach  # uploads and builds
    ```
    Repeat for worker, web, caddy.
27. Tail deployment logs:
    ```bash
    railway logs --service api --tail
    ```
    Watch for the expected startup sequence: env loaded → DB pool created → middleware stack registered → Uvicorn "Application startup complete."
28. Health check: hit the internal `/health/ready` via curl through Caddy. Expect 200. If 503, inspect service logs; common issues: missing env var, DB migration not run.

### Phase 7 — Database Migrations (Staging)

29. Alembic migrations don't run automatically on boot (by design — we want explicit control over schema changes in production).
30. Run via a one-shot job:
    ```bash
    railway run --service api alembic upgrade head
    ```
    The `railway run` command starts a container with the service's env, runs the command, exits. Useful for one-shot admin tasks.
31. Verify schema:
    ```bash
    railway connect postgres
    # In psql:
    \dt       -- list tables
    SELECT count(*) FROM pg_extension WHERE extname IN ('pgcrypto','btree_gist','pg_partman');
    ```
32. Run the seed script for staging (creates demo data):
    ```bash
    railway run --service api python -m scripts.seed_dev --environment staging
    ```
    Seed is idempotent; running multiple times is a no-op.

### Phase 8 — DNS & TLS Setup (Staging)

33. DNS records required for staging (instructions in `docs/deployment/DNS_SETUP.md` for the user if the agent can't drive the DNS provider directly):
    - `staging.forge.app` → CNAME to the Railway-assigned caddy service domain.
    - `api-staging.forge.app` → CNAME to the Railway caddy service.
    - `*.staging.forge.app` → CNAME to caddy (wildcard for future per-tenant subdomains).
    - Email SPF/DKIM/DMARC for Resend (per Resend's onboarding).
34. If the user's DNS provider has an API we can drive (Cloudflare in particular), the agent automates:
    ```bash
    # Example Cloudflare API call
    curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -d '{"type":"CNAME","name":"staging","content":"caddy-service.up.railway.app","ttl":300,"proxied":false}'
    ```
35. Verify propagation:
    ```bash
    dig +short staging.forge.app
    ```
    Wait until the CNAME resolves, then test HTTPS:
    ```bash
    curl -I https://staging.forge.app
    ```
    TLS cert should be issued automatically by Caddy within 30-60 seconds of first request. If cert fails, check Caddy logs for ACME errors.

### Phase 9 — Integration Endpoints (Staging)

36. **Stripe webhook registration**:
    ```bash
    stripe listen --forward-to https://api-staging.forge.app/api/v1/webhooks/stripe
    # Register the production webhook via the Stripe dashboard or CLI
    ```
    Set `STRIPE_WEBHOOK_SECRET` to the value Stripe provides. Verify a test event is received:
    ```bash
    stripe trigger checkout.session.completed
    # In another terminal:
    railway logs --service api --tail | grep stripe_webhook
    ```
37. **Resend domain verification**: add the SPF/DKIM/DMARC records per Resend's domain setup. Send a test email from the API:
    ```bash
    railway run --service api python -c "from app.services.email import send_test; send_test('test@example.com')"
    ```
38. **Google OAuth client**: register the Google Calendar OAuth client in the Google Cloud Console with redirect URI `https://api-staging.forge.app/api/v1/integrations/google-calendar/callback`.
39. **OpenAI / Anthropic / Gemini keys**: confirm they work against staging by running:
    ```bash
    railway run --service api python -m scripts.test_providers
    ```
    The script makes a trivial call to each provider, confirms token consumption is logged, confirms the fallback chain triggers when a provider is forced to fail via a test env var.

### Phase 10 — End-to-End Smoke on Staging

40. Run the Playwright E2E suite against staging:
    ```bash
    BASE_URL=https://staging.forge.app pnpm --filter @forge/web test:e2e
    ```
    All tests green against the live staging environment. If tests pass locally but fail against staging, root-cause: env-var differences, missing service dependency, DNS issue, etc. Fix before continuing.
41. Run a manual walkthrough matching Phase 2-21 of the FINAL_SMOKE_TEST_POLISH mission but against staging. Note any environmental issues; fix.
42. Verify metrics emission: `railway logs --service api --tail` shows structured log entries with org_id and user_id. Prometheus `/metrics` endpoint returns data.

### Phase 11 — Production Environment

43. Repeat Phases 4-10 for the `production` environment:
    ```bash
    railway environment use production
    ```
44. Differences from staging:
    - DNS: `forge.app`, `www.forge.app`, `api.forge.app`, `*.forge.app` (the wildcard for custom-domain-adjacent subdomains).
    - Env vars: LIVE Stripe keys, production OpenAI keys, production Sentry DSN, R2 bucket `forge-production`, etc.
    - Resend: production-verified sending domain.
    - Google OAuth: production client.
    - Scale: increase `numReplicas` to 2 for the web and api services for redundancy.
    - Database: enable Railway's automated backups (daily, 30-day retention). Configure a weekly manual backup via cron for extra safety.
    - Redis: maxmemory-policy `allkeys-lru` to prevent OOM from cache growth.
45. Production migrations:
    ```bash
    railway environment use production
    railway run --service api alembic upgrade head
    ```
    Then seed the template library (not the dev-seed):
    ```bash
    railway run --service api python -m scripts.seed_templates --environment production
    ```
46. Production smoke test: Playwright suite pointed at production. CAREFULLY — don't create junk data; use a dedicated `qa@digitalstudiolabs.com` test account with a clearly marked org "QA Test Org (do not use for real work)".

### Phase 12 — CI/CD Pipeline

47. Create `.github/workflows/deploy-staging.yml`:
    - Trigger: push to `main`.
    - Runs the full test suite (unit + E2E + security).
    - On green, Railway auto-deploys staging (via GitHub linking). No manual step.
    - Post-deploy hook: runs the staging smoke test Playwright subset (10-minute max).
    - On staging-smoke-test failure: rollback via `railway redeploy --previous`.
48. Create `.github/workflows/deploy-production.yml`:
    - Trigger: manual workflow dispatch OR a tag push matching `v*`.
    - Requires a reviewer approval (GitHub environment protection rule for the `production` environment).
    - Runs the same full test suite.
    - On approval, triggers the production deploy via Railway GraphQL API (`deploymentTrigger` mutation) with the commit SHA.
    - Post-deploy: wait for health check green, then run the production smoke subset.
    - On failure: auto-rollback via Railway API to the previously healthy deployment.
49. Store `RAILWAY_TOKEN_STAGING` and `RAILWAY_TOKEN_PRODUCTION` in GitHub Actions secrets (separate tokens — one per environment, principle of least privilege).
50. Branch protection: `main` requires PR with approvals + green CI; no direct pushes. Tags starting with `v` can only be created by GitHub Actions (not humans) via the release workflow.

### Phase 13 — Observability & Alerting

51. **Sentry** (already integrated in the app via BI-02):
    - Create two Sentry projects: `forge-api` (covers api + worker), `forge-web`.
    - Configure release tracking — on deploy, GitHub Actions creates a Sentry release matching the commit SHA, uploads source maps for web.
    - Alert rules: any new unresolved error in production; any event rate > 2× baseline; crash-free rate < 99%.
52. **Uptime monitoring**: use Railway's built-in health checks plus an external provider (Better Uptime, UptimeRobot, or similar) hitting `https://forge.app/health` and `https://api.forge.app/health/ready` every 30 seconds. Multi-region probes. Alert via email + phone.
53. **Prometheus scraping**: Railway doesn't natively scrape `/metrics`. Options:
    - Push metrics to Grafana Cloud (free tier sufficient for day-one) via the OpenTelemetry Collector running as a sidecar or a separate Railway service.
    - Or simpler: a scheduled Cloudflare Worker polls `/metrics` every 30s and forwards to Grafana.
    Choose the simplest option that works; document the choice.
54. **Log aggregation**: Railway retains logs for 30 days on the Pro plan. For longer retention and structured querying, forward logs to a destination:
    - BetterStack / Logtail / Datadog Logs — pick one.
    - Configured via Railway's log drain (syslog protocol).
55. **On-call setup** (Brian + backup):
    - PagerDuty (or Incident.io / AlertOps — Brian's pick). Brian is primary on-call for launch week. Configure escalation to a designated secondary after 15 minutes.
    - Runbook linked from every alert notification.

### Phase 14 — Backup & Disaster Recovery

56. **Postgres backups**:
    - Railway automated daily backups enabled (confirmed Phase 11).
    - Additional weekly logical backup via `pg_dump`:
        ```bash
        # Scheduled via a cron service on Railway or GitHub Actions
        railway run --service api pg_dump $DATABASE_URL -Fc -f /tmp/backup.dump
        # Upload to R2 with lifecycle policy: keep for 1 year
        ```
57. **R2 object storage backups**: R2 has cross-region replication — enable it for the production bucket. Lifecycle: keep uploaded files forever for published pages; purge submission files per org retention settings (90/180/365 days depending on plan).
58. **Disaster recovery runbook** `docs/runbooks/DISASTER_RECOVERY.md`:
    - Postgres corruption or loss: restore from latest Railway backup; if < 24h RPO needed, restore from latest logical pg_dump.
    - Redis loss: expected behavior, cache cold-starts; no data loss (Redis only holds caches and rate-limit state).
    - R2 bucket loss: restore from cross-region replica; published pages re-render from the latest revision (HTML is also in Postgres); submission files may be unrecoverable if they were only in the lost region — document this tradeoff.
    - Full Railway outage: document the procedure to migrate to a secondary provider (Render, Fly.io) — stored in the runbook as a plan, not rehearsed in this mission.
59. **Quarterly disaster-recovery drill**: a calendar reminder for Brian to restore a backup to a scratch environment and verify integrity. Scheduled on the first-of-the-quarter.

### Phase 15 — Custom Domain Flow (End-User Feature)

60. Verify the custom-domain feature from BI-04 works end-to-end in production:
    - Create a test org with a Pro plan.
    - Add a custom domain via Settings → Custom Domains.
    - Add the verification TXT record in the test domain's DNS.
    - Click Verify.
    - Within 60 seconds, the domain is active.
    - Visit the custom domain — Caddy issues a fresh TLS cert on-demand, the page renders, analytics track correctly.
61. Caddy's on-demand TLS uses the internal validation endpoint from BI-04. Monitor Caddy logs during the test to confirm the ACME flow succeeds. Potential gotcha: Let's Encrypt rate limits (50 certs per week per registered domain). Implement a safety check that limits cert issuance requests to avoid exceeding the rate limit.

### Phase 16 — Launch Readiness Review

62. **Brian's final checklist** (a deliberate gate before we flip to live):
    - All services healthy in production.
    - All external integrations (Stripe, Resend, Google, OpenAI, Anthropic, Gemini) responding correctly.
    - DNS propagation verified.
    - TLS certificates issued for all domains.
    - Backups running nightly; latest backup tested via a restore-to-scratch-env.
    - Monitoring + alerting fires on test incidents.
    - Runbooks exist for: deployment, rollback, disaster recovery, common incident types (degraded LLM, cost spike, DB slow, webhook failure).
    - Admin bootstrap complete (Brian is Super Admin; a trusted backup is Super Admin).
    - First support email address (`support@forge.app`) configured with forwarding.
    - Legal: Terms of Service and Privacy Policy pages published at `/terms` and `/privacy`.
    - Status page (`status.forge.app`) live, even if only a single "all systems normal" indicator.
63. Sign off on the checklist in `docs/LAUNCH_CHECKLIST.md` with timestamps for each item. Any unchecked item blocks launch.

### Phase 17 — Go-Live Rehearsal

64. Rehearsal: the day before launch, walk through the full go-live process on staging ONE more time:
    - Deploy a tagged build.
    - Smoke test.
    - Intentionally introduce a bug (e.g., bad env var), rollback, verify the rollback works and recovery time is < 5 minutes.
    - Measure the time of every step. Document realistic timelines in `docs/runbooks/GO_LIVE_PLAYBOOK.md` so Brian has expectations on launch day.
65. Inspect every dashboard (Overview, Pulse, LLM, System Health) during the rehearsal. Confirm live data flows.
66. Verify rollback procedure:
    ```bash
    railway service use api
    railway redeploy --previous    # rolls back to the prior deployment
    ```
    Plus for GitHub-linked: `git revert` the offending commit and push; Railway auto-deploys the revert.

### Phase 18 — Documentation

67. `docs/deployment/RAILWAY_SETUP.md` — the complete Railway setup from scratch, step-by-step. Someone new to the project should be able to reproduce staging/production from this doc.
68. `docs/deployment/ENV_MANIFEST.md` — the authoritative env var reference.
69. `docs/deployment/DNS_SETUP.md` — DNS instructions for forge.app and staging.
70. `docs/runbooks/DEPLOYMENT.md` — how to deploy a new change, how to roll back, how to run a hotfix.
71. `docs/runbooks/GO_LIVE_PLAYBOOK.md` — the full Day-of-Launch procedure with expected timings.
72. `docs/runbooks/DISASTER_RECOVERY.md` — as described in Phase 14.
73. `docs/runbooks/INCIDENT_RESPONSE.md` — what to do when: LLM costs spike, a customer reports broken email, a wave of 5xx appears, a webhook is flapping, Stripe disputes come in.
74. Mission report: the commit SHA of the first production deploy, the live URLs, the timing of each phase, the list of outstanding minor polish items.

---

## Acceptance Criteria

- Railway CLI authenticated; project `forge` provisioned with `staging` and `production` environments.
- All four services (api, worker, web, caddy) deployed to both environments.
- Postgres and Redis plugins provisioned with required extensions.
- All env vars set via CLI; audit script passes for both environments.
- Database migrations applied in both environments; schema verified.
- DNS records in place; TLS certs issued for all domains including on-demand wildcard.
- Stripe, Resend, Google OAuth, OpenAI, Anthropic, Gemini all integrated and verified.
- Custom-domain feature works end-to-end in production.
- Sentry error tracking, uptime monitoring, log aggregation, on-call all configured.
- Backup schedule running; disaster recovery runbook documented and drill-tested.
- CI/CD pipeline deploys staging automatically on merge; production deploy is manual with review gate.
- Rollback procedure verified via rehearsal.
- Launch checklist complete; all runbooks written.
- Production smoke test (Playwright subset) green.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
