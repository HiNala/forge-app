# Forge — Go-Live Mission Set

Four missions that take Forge from "built and tested" to "live in production, tracked, monitored, and operated as a business."

- **[GL-01 — Engagement Analytics](./GL01_ENGAGEMENT_ANALYTICS.md)** — Full product-analytics stack: event taxonomy, client trackers (public + in-app), session stitching, identity merge, funnel engine with drop-off, retention cohorts, custom events, segmentation, data export. Brian can pull any slice of behavioral data later.
- **[GL-02 — Admin Dashboard & Platform RBAC](./GL02_ADMIN_DASHBOARD_RBAC.md)** — Control plane. Platform-level roles (Super Admin, Admin, Support, Analyst, Billing) decoupled from per-org roles. Admin dashboards for traffic, signups, MRR, LLM cost attribution by provider/model/role/org/user, system health, audit log. Pulse view answers "how's Forge doing" in 30 seconds.
- **[GL-03 — Integration Testing](./GL03_INTEGRATION_TESTING.md)** — Everything unit tests don't catch. Playwright E2E across all workflows, k6 load tests with documented thresholds, OWASP security probes, webhook replay, calendar DST/recurrence edge cases, LLM provider chaos, exhaustive RLS audit across every table, accessibility automation, visual regression. The "go-live green" gate.
- **[GL-04 — Railway Deployment via CLI](./GL04_RAILWAY_DEPLOYMENT.md)** — The agent drives Railway CLI to provision staging + production, configure services with monorepo root directories + watch paths, wire Postgres/Redis plugins, set all env vars, run migrations, set up DNS + on-demand TLS via Caddy, register Stripe webhooks, configure CI/CD with auto-staging and gated production, set up monitoring/alerting/backups, exercise the rollback procedure, and finally flip the switch.

---

## Execution Order

These missions are strictly sequential. Each one depends on outputs from prior ones.

```
GL-01 (engagement analytics)
  ↓
GL-02 (admin dashboard — uses GL-01's analytics data)
  ↓
GL-03 (integration testing — must include tests for GL-01 + GL-02 features)
  ↓
GL-04 (deployment — deploys the build GL-03 certified "green")
```

GL-04 produces the live `forge.app`. After GL-04 completes, Brian has:
- A production system on Railway serving real traffic.
- Full engagement tracking from day one (no retroactive tracking — you either had it at launch or you didn't).
- An admin dashboard to run the business.
- Monitoring, alerting, on-call, backups, and rollback all exercised.

---

## What This Set Addresses From Brian's Brief

> **"Make sure the application is tracking engagement metrics, how many people and on what page, what the drop-off points are — we need to be tracking all of this data in full detail so I may pull it later."**
> → GL-01: 80+ events in the taxonomy, per-user timelines, funnel drop-off with field-level breakdown, custom segments, raw/aggregated/streaming exports.

> **"I need an admin dashboard so we need user access controls and my admin dashboard I want to be able to see traffic stats, important information about what's going on, how many users, how many sign-ups, full AI token count and from what models."**
> → GL-02: Platform RBAC with 5 default roles; admin surfaces for traffic, users, signups, MRR, full LLM cost attribution by provider/model/role/workflow/org/user/page with quality score tracking.

> **"Cover any missing testing of application behavior or any settings or things we may have missed."**
> → GL-03: E2E journeys across everything, chaos for every dependency, exhaustive RLS audit (our biggest safety net), security probes for every OWASP category, contract tests between frontend and backend.

> **"Deployment to Railway with their CLI or whatever the easiest way — hopefully the coding agent can do basically everything for me."**
> → GL-04: Every step scripted via Railway CLI. The agent provisions, configures, migrates, smoke-tests, and promotes. Brian's only manual steps: sign up for Railway, paste in secrets, approve the production deploy gate on launch day.

---

## What "Done" Means For The Go-Live Set

Done = live.

- `https://forge.app` serves the marketing site.
- `https://staging.forge.app` is a mirror for QA.
- A real user can sign up, build a contact form, publish it, share it with a client, receive a submission, reply to it, and get charged when they upgrade.
- Brian can log in to `/admin`, see today's numbers, and identify any issue within minutes.
- When something breaks, the runbook tells the on-call what to do.
- When something breaks badly, `railway redeploy --previous` restores service in under 5 minutes.

After the Go-Live set, the product isn't "launched" in a marketing sense — it's **operational**. Launch is a separate act of announcing. This set puts you in a position where when you press "announce," the system doesn't buckle.
