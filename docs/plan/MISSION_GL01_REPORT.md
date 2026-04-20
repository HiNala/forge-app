# Mission GL-01 — Engagement analytics (status)

## Summary

GL-01 is implemented in-repo as **telemetry infrastructure** aligned with Mixpanel/PostHog-style event semantics: authoritative taxonomy + DB CHECK, partitioned `analytics_events` with queryable columns, identity merges, ingestion with validation and dedupe, funnels, retention MV, realtime and timeline APIs, segments/experiments/custom-events tables (migration `g101_gl01_engagement_analytics`), public `forge-track.js`, and in-app `useAnalytics` helper.

This report documents **delivery**; deeper product polish (full engagement UI charts, nightly archive jobs, 5k event/sec load tests) may continue in follow-up missions.

## Delivered artifacts

| Area | Location |
|------|-----------|
| Taxonomy + validation | `apps/api/app/services/analytics/events.py` |
| Schema + CHECK + indexes + MV + aux tables | `apps/api/alembic/versions/g101_gl01_engagement_analytics.py` |
| Ingestion + public/authenticated handlers | `track_public.py`, `ingestion.py`, `api/v1/analytics.py` |
| Identity helpers | `identity.py`, `identity_merge` model |
| Funnels | `funnels.py`, default contact funnel route |
| Retention | `retention.py`, `retention_signup_weekly` |
| Public tracker | `apps/web/public/forge-track.js` |
| In-app tracker | `apps/web/src/lib/analytics/tracker.ts` |
| Engagement surface (stub/links) | `apps/web/src/app/(app)/analytics/engagement/page.tsx` |
| Docs | `docs/architecture/EVENT_TAXONOMY.md`, `ANALYTICS.md`, runbook + user guide |

## Verification

- `uv run pytest` — includes `test_gl01_analytics_registry.py`, `test_gl01_funnel_compute.py`, and integration tests touching analytics events.
- Apply migrations before local runs: `uv run alembic upgrade head` in `apps/api`.

## Follow-ups (non-blocking)

- Expand Playwright coverage for `forge-track.js` flush/beacon.
- k6 load test at stated QPS in staging.
- Parquet archive worker for partitions older than policy (Phase 8 in mission brief).
