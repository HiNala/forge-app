# MISSION 08 — Railway Deployment & Go-Live

**Goal:** Take the fully-polished, fully-tested application from Mission 07 and deploy it to Railway as a production-grade service. Set up monitoring, alerting, custom domains, runbooks, and the ops discipline needed to keep Forge healthy once real users arrive. After this mission, Forge runs in production at `forge.app`, and Brian has a runbook for every likely incident.

**Branch:** `mission-08-railway-deploy`
**Prerequisites:** Mission 07 complete. Application passes all tests, hits performance targets, has no blocking security issues.
**Estimated scope:** Ops-heavy. Not much new code — lots of configuration, scripting, and documentation.

---

## How To Run This Mission

Read `docs/external/infrastructure/railway-deployment.md` and `docs/external/infrastructure/caddy-reverse-proxy.md` from Mission 00 before touching anything. These should be authoritative by now.

The deploy discipline: **every configuration change is reversible in under 5 minutes.** Railway's environment management supports this — use staging first, then promote to production. Do not debug in production.

Commit on milestones: Railway project scaffolded, staging deploy green, production deploy green, monitoring live, DNS cut over, first production smoke test passed.

**Do not stop until every item is verified complete. Do not stop until every item is verified complete. Do not stop until every item is verified complete.**

---

## TODO List

### Phase 1 — Railway Project Setup

1. Create a Railway project. Configure three environments: `dev` (personal dev shared env), `staging`, `production`.
2. Define the services per environment:
    - **web** — Next.js app, built from `apps/web/Dockerfile`
    - **api** — FastAPI app, built from `apps/api/Dockerfile`
    - **worker** — arq worker, built from `apps/worker/Dockerfile`
    - **caddy** — Caddy reverse proxy for custom domain routing, built from `infra/caddy/Dockerfile`
    - **postgres** — Railway's managed Postgres 16 (pgvector + pg_partman extensions enabled)
    - **redis** — Railway's managed Redis 7
    - **minio** → **cloudflare r2** or **aws s3** (object storage — Railway does not host S3; use an external bucket. Recommended: Cloudflare R2 for cost; no egress fees.)
3. Use private networking: services communicate over Railway's internal DNS (`api.railway.internal`, `postgres.railway.internal`), not public URLs.
4. Set up resource limits per service per env. Staging: small. Production: start modest (1 vCPU / 1GB per service), scale with real load.

### Phase 2 — Environment Variables & Secrets

5. Populate each env's variables from `.env.example`. Use Railway's secret management — never commit to git.
6. Generate per-env secrets for `SECRET_KEY`. Never reuse across envs.
7. Set up production Stripe keys (live mode). Configure the production webhook endpoint in Stripe dashboard.
8. Set up production Resend domain (verify `forge.app`). Update DNS records per `docs/runbooks/EMAIL.md`.
9. Set up production Google OAuth (separate from dev); update authorized redirect URIs.
10. Set up production Sentry project; set DSN per env.
11. Set up production PostHog (separate project from user-facing analytics).
12. Document every env var's purpose in `docs/runbooks/ENVIRONMENTS.md` including which service reads it and what the impact is if missing/wrong.

### Phase 3 — Database Migration Strategy

13. On first production deploy, run `alembic upgrade head` as a one-off Railway job.
14. For subsequent deploys: the API container runs migrations as part of its startup command (`alembic upgrade head && uvicorn ...`). This is safe because Alembic holds a migration lock.
15. For long-running migrations (adding indexes on large tables), use Railway's job feature to run them separately before the main deploy. Document the pattern in `docs/runbooks/MIGRATIONS.md`.
16. Configure pg_partman's maintenance job to run daily via a Railway cron job. Use arq's cron feature inside the worker service.
17. Set up daily `pg_dump` backups via a Railway cron job to an R2 bucket with 30-day retention. Backup restoration is tested monthly (documented in the runbook).

### Phase 4 — Caddy for Custom Domains

18. Build the Caddy container with the config that enables `on_demand_tls`:
    ```
    {
      on_demand_tls {
        ask https://api.forge.app/internal/caddy/validate
        interval 2m
        burst 5
      }
    }
    
    *.forge.app {
      reverse_proxy web.railway.internal:3000
    }
    
    :443 {
      tls {
        on_demand
      }
      @customDomain {
        not header Host forge.app
        not header_regexp Host ^.*\.forge\.app$
      }
      reverse_proxy @customDomain web.railway.internal:3000
    }
    ```
19. Expose the Caddy service on a public port. Point Railway's public HTTPS endpoint at Caddy, not at `web` directly.
20. Implement `GET /internal/caddy/validate?domain=...` on the API — queries `custom_domains` table, returns 200 if the domain is verified, 404 otherwise. This endpoint is only reachable from the Caddy service over private networking; document that in the IP allowlist pattern if Railway supports it, else rely on Railway's private-network-only exposure.
21. Test custom domain flow end-to-end in staging with a real domain you control.

### Phase 5 — Observability & Alerting

22. Configure Sentry for both apps in production. Verify that an intentional test exception surfaces with correct user/org context.
23. Configure structured JSON logging to stdout. Railway aggregates logs; use their log explorer for basic querying.
24. Set up alerting on critical signals:
    - API p95 latency > 2s for 5 minutes → page
    - API error rate > 1% for 5 minutes → page
    - Worker queue depth > 100 → warn
    - Stripe webhook delivery failures > 3 in an hour → page
    - LLM provider cost exceeding daily budget → warn
    - Disk usage on Postgres > 80% → warn
25. Alerts route to a Slack/Discord channel the team monitors, plus email to the on-call.
26. Set up status page at `status.forge.app` using a service like BetterStack or Instatus. Surfaces core service health checks.

### Phase 6 — Domain & DNS

27. Register `forge.app` (or verify it's registered). Configure DNS:
    - `forge.app` A/AAAA → Railway's public IP
    - `www.forge.app` CNAME → `forge.app`
    - `*.forge.app` wildcard CNAME → Railway's public IP (for workspace subdomains)
    - `api.forge.app` CNAME → Railway's public IP (for the API)
    - `status.forge.app` CNAME → status page provider
    - MX records for email receiving (if inbound email routing is needed in the future — post-MVP)
28. Set up a `staging.forge.app` subdomain pointing at the staging environment for internal testing.
29. Verify Let's Encrypt certificates issue correctly for `forge.app`, `*.forge.app`, and test custom domains.

### Phase 7 — CI/CD Pipeline

30. Wire GitHub Actions → Railway deploys:
    - Push to `main` → deploy to `staging` automatically if CI passes.
    - Manual workflow dispatch → deploy to `production` (requires approval in GitHub Environments).
31. Add a smoke test step that runs against the deployed environment before marking the deploy green. Tests: health check, sign-in flow, generate a test page. Uses a dedicated test user account in each env.
32. Rollback plan: Railway maintains the previous deployment; a single-click rollback is documented. Rollbacks also re-run migrations in reverse — for migrations that can't be safely reversed (e.g., column drops), the rollback is blocked with a warning.

### Phase 8 — Capacity Planning & Cost Modeling

33. Estimate monthly cost at 100 users (MVP), 1000 users, 10000 users. Include Railway compute, Postgres, Redis, R2, Resend, Stripe fees, LLM API costs.
34. Document in `docs/runbooks/COST_MODEL.md`. Set a budget alert on the LLM providers.
35. Configure LLM provider rate limits per tenant tier to prevent a single runaway tenant from exhausting the monthly LLM budget.

### Phase 9 — Runbooks

36. Write `docs/runbooks/DEPLOYMENT.md` — step-by-step for a production deploy.
37. Write `docs/runbooks/ROLLBACK.md` — how to revert a bad deploy, including migration considerations.
38. Write `docs/runbooks/INCIDENT_RESPONSE.md` — severity levels, communication template, post-mortem pattern.
39. Write `docs/runbooks/ONCALL.md` — who's on call, how alerts are routed, response time expectations.
40. Write `docs/runbooks/DATABASE.md` — how to connect, how to run a migration, how to take a manual backup, how to restore from backup.
41. Write `docs/runbooks/LLM_OUTAGE.md` — what to do if OpenAI is down (provider fallback should auto-activate; verify; manually switch the route if needed).
42. Write `docs/runbooks/FIRST_PRODUCTION_BUG.md` — template for triaging the first real production bug (because there will be one).

### Phase 10 — Launch Readiness

43. Run a pre-launch checklist:
    - [ ] All envs green in CI
    - [ ] Production deploy succeeds
    - [ ] Smoke test passes
    - [ ] Sentry captures test error
    - [ ] Stripe test purchase completes end-to-end
    - [ ] Resend test email delivers
    - [ ] Google Calendar test event creates
    - [ ] Analytics tracker fires on published page
    - [ ] Custom domain end-to-end works on a real domain
    - [ ] Rollback procedure tested (rollback staging deploy, verify, re-deploy)
    - [ ] Backup-restore procedure tested
    - [ ] Status page live
    - [ ] Alerts configured and firing correctly (trigger a test alert)
    - [ ] On-call schedule documented
    - [ ] Incident response template ready
    - [ ] Pricing page reachable at `forge.app/pricing`
    - [ ] Signup works end-to-end in production with a real user
    - [ ] First real page generates correctly
    - [ ] First real submission arrives and triggers automations
44. Create the `forge.app` landing page redirect from `www.forge.app`.
45. Set up `robots.txt` and `sitemap.xml` for the marketing pages. Block crawling of `/app/*`, `/api/*`, `/p/*` (the published page subdomain is under a different host anyway).
46. Seed a Digital Studio Labs internal org in production with Brian as the Owner. Use it for dogfooding.
47. Final mission report summarizing what's live, what's deferred, and the post-launch operational cadence.

---

## Acceptance Criteria

- Production deploys on Railway with all services green.
- `forge.app` is reachable, secured with a valid TLS cert, serves the marketing site.
- Signup → onboarding → Studio → publish → submit → email + calendar works end-to-end on production.
- Custom domain flow works end-to-end on a real domain.
- Monitoring is configured; a test alert fires and is received.
- Backups run daily and are restorable.
- All runbooks are written and reviewed.
- CI/CD deploys to staging automatically; production requires approval.
- Rollback procedure is tested and documented.
- Dogfooding org is live with Brian as Owner.
- Mission report written.

---

## Repo tracking (living)

Deploy & runbooks vs this brief: **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** (Mission **08 — Railway** in *By mission document*).

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
