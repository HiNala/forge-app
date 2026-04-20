# Analytics architecture (GL-01)

## Goals

Forge collects **event + properties + identity** (visitor, session, optional user) for public published pages and the authenticated web app, with server-side validation, batch ingestion, and query surfaces for funnels and retention.

## Data flow

1. **Public** — `POST /p/{org_slug}/{page_slug}/track` (see `public_runtime` / `track_public.py`) batches up to 20 events. Org and page are resolved from the URL; `user_id` is never taken from the client.
2. **Authenticated** — `POST /api/v1/analytics/track` (`handle_authenticated_track_batch`) uses Clerk session + active org; `page_id` in metadata is validated against the org.
3. **Validation** — `app/services/analytics/events.py` defines `EVENTS` and `validate_event_payload` (required metadata keys). PostgreSQL `ck_analytics_events_event_type` mirrors system names; `custom.{...}` allowed when registered per org.
4. **Ingestion** — Rows are queued and batch-written (`ingestion.py`) with optional Redis dedupe on `client_event_id`, rate limits, and backpressure handling.
5. **Enrichment** — IP (anonymized), UA parsing, referrer/UTM, optional GeoLite-style country, `received_at`.

## Identity

- **visitor_id** / **session_id** — Generated or continued via cookies for public traffic; in-app uses stable synthetic visitor id when absent.
- **identity_merges** — Links `visitor_id` → `user_id` for timeline stitching (`identity_merge` event and `record_identity_merge`).
- **Experiments** — Deterministic variant from visitor + experiment key (`identity.experiment_variant`); stored on rows as `experiment_arm` JSONB.

## Query surfaces

- **Funnels** — `app/services/analytics/funnels.py`: sequential steps within `conversion_window`, `compute_funnel_cached` with Redis TTL.
- **Retention** — `retention.py` + materialized view `retention_signup_weekly` (migration `g101_gl01_engagement_analytics`).
- **Realtime / timelines / exports** — See `app/api/v1/analytics.py` and `analytics_service.py`.

## Schema

Partitioned `analytics_events` (time) with first-class columns for UTM, device, workflow, flags (see `g101_gl01_engagement_analytics`).

## Related docs

- [EVENT_TAXONOMY.md](./EVENT_TAXONOMY.md) — event names and example payloads.
- [../runbooks/ANALYTICS_DEBUGGING.md](../runbooks/ANALYTICS_DEBUGGING.md) — operations.
