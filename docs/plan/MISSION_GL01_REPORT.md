# Mission GL-01 — Engagement analytics (report)

**Branch:** `mission-gl-01-engagement-analytics`  
**Status:** Core platform delivered; some acceptance items remain for follow-up (see below).

## Delivered

- **Taxonomy** — `app/services/analytics/events.py` with `EventDefinition` registry; DB CHECK + custom `custom.*` pattern; migration renames legacy event types.
- **Schema** — `analytics_events` extended (user, source, UTM, device, flags, `client_event_id`, `received_at`, etc.); partial indexes; `identity_merges`, `analytics_funnels`, `analytics_segments`, `custom_event_definitions`, `experiments`, `analytics_export_jobs`; MV `retention_signup_weekly`.
- **Ingestion** — Async queue + batch insert; Redis dedupe; test-mode synchronous path; enrichment (UA, geo hints).
- **API** — `POST /api/v1/analytics/track`; realtime, retention, default funnel compute, user/visitor timelines.
- **Clients** — `apps/web/public/forge-track.js` + config injection from `inject_forge_tracker`; `apps/web/src/lib/analytics/tracker.ts` hook; `/(app)/analytics/engagement` surface.
- **Worker** — `refresh_retention_views` cron; `purge_deleted_user` clears `user_id` on analytics rows.
- **Docs** — `EVENT_TAXONOMY.md`, `ANALYTICS.md`, `ANALYTICS_DEBUGGING.md`, `ANALYTICS_GUIDE.md`.

## Deferred / partial

- Full **segment AST**, **custom event CRUD**, **export worker** to S3, **BI read-only user**, **experiment analysis UI**, **Playwright tracker E2E**, **5k events/sec load test**, **GeoLite2** files (headers-only country for now), **monthly Parquet archive** job, **per-org partman** row purge vs global partitions (documented approach in mission; worker still uses existing `drop_old_analytics_partitions` pattern).

## Verification

- Run `py -3.12 -m pytest tests/test_gl01_analytics_registry.py` (registry tests).
- `tests/test_gl01_funnel_compute.py` — seeded contact funnel, asserts `compute_funnel` structure.
- Apply migration `g101_gl01_engagement_analytics` before integration tests against Postgres.
- **In-app route tracking:** `useAnalytics` uses `dashboard_view` with `{ route, surface }` (not `page_view`, which requires `page_id`).
