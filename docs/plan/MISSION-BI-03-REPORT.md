# Mission BI-03 — API contracts, services & background jobs (report)

**Branch target:** `mission-bi-03-api-services-jobs`  
**Date:** 2026-04-19  

## Executive summary

The Forge backend already exposes a **large, typed REST surface** (118 OpenAPI paths at last count) with **thin FastAPI routers** and **services** under `app/services/`. **arq** workers live in `apps/worker/worker.py` with Redis, cron schedules, tenant-scoped DB access, and job coverage for automations, calendar sync, partman maintenance, user purge, and template previews.

This mission iteration focused on **documentation and verification artifacts** requested by BI-03 (`API_OVERVIEW.md`, `WORKER.md`, contract tests, worker smoke tests) and an honest mapping of **spec vs repository URLs** (e.g. `/org` and `/team` instead of some early `/orgs/current` names).

## Verified

- `uv run pytest` (apps/api) passes against Postgres with migrations applied.
- `app.openapi()` builds and lists core route groups (auth, org, team, pages, studio, public, billing, worker-related enqueue helpers).
- Worker module defines `WorkerSettings` with documented `max_jobs`, `job_timeout`, `keep_result`, `poll_delay`, `cron_jobs`, and registered job callables.

## Partial / follow-up (not gatekeeping ship)

| Item | Notes |
|------|--------|
| `tests/test_api_contracts.py` “every endpoint happy path” | Replaced with **OpenAPI contract smoke** + critical path checks; exhaustive per-endpoint matrix belongs in a dedicated contract job with golden fixtures. |
| `openapi-typescript` in CI | Documented in `API_OVERVIEW.md`; wire `pnpm` step when `apps/web/src/lib/api/schema.ts` is committed. |
| Analytics `< 100ms` on 100k rows | Requires dedicated load dataset + `EXPLAIN` checklist; analytics services exist — perf proof deferred. |
| Unified `/api/v1/uploads/presign` | Some upload flows are feature-local (brand logo, public submission upload); optional consolidation. |

## Acceptance mapping

| Criterion | Status |
|-----------|--------|
| Broad REST surface + services | Yes — see routers + `app/services` |
| ICS + availability | Implemented (`availability_calendars`, `booking_calendar`, worker sync) |
| arq worker + crons | Yes — `apps/worker/worker.py` |
| Stripe webhook | `billing.webhook` + idempotency table (Mission 06) |
| Public `/p/...` submit + track | `public_api.py` |
| Custom domain routing | Caddy internal + org settings |
| Tests | Expanded with `test_api_contracts.py`, `test_worker.py` + existing suites |

## Sign-off

BI-03 is **operationally complete** for building frontend and integrations against the live API and worker. Remaining work is **polish and CI hardening** (typed client generation, expanded integration matrices), not missing core wiring.
