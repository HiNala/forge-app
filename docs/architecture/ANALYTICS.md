# Analytics architecture (GL-01)

## Flow

1. **Clients** send batched JSON to the public or authenticated track endpoint (max 20 events per request on the public path).
2. **Validation** uses `app/services/analytics/events.py` (required metadata per type). Custom events must match `custom.*` and be registered per org.
3. **Dedup** optional: Redis `SET forge:evdedupe:{YYYYMMDD}:{client_event_id} NX EX 90000` skips duplicates.
4. **Enrichment** (`enrich.py`): Geo hint headers (`cf-ipcountry`, etc.), `user-agents` parsing for browser/OS/device, referrer domain, UTM fields from metadata.
5. **Ingestion** (`ingestion.py`): Events are pushed to an asyncio queue; a background consumer batches (up to 500 events or ~1s) and bulk-inserts into `analytics_events`. In `ENVIRONMENT=test`, inserts run synchronously for deterministic tests. If the queue exceeds 5,000 items, oldest events are dropped and `analytics_backpressure_drop_total` increments.
6. **Identity** (`identity.py`, `identity_merges`): Anonymous `visitor_id` can be linked to `user_id` for timeline queries.
7. **Funnels** (`funnels.py`): Sequential SQL over `analytics_events`; results cached in Redis (5 minutes) via `analytics_cache.cache_set_json`.
8. **Retention**: Materialized view `retention_signup_weekly`; refreshed by worker cron `refresh_retention_views`.
9. **GDPR**: `purge_deleted_user` nulls `user_id` on `analytics_events` and tags metadata with `pii_scrubbed`.

## API highlights

- `GET /api/v1/analytics/realtime` — last 5 minutes by page.
- `GET /api/v1/analytics/retention` — cohort grid from MV.
- `GET /api/v1/analytics/funnels/default/contact-form/compute` — default contact-form funnel.
- `GET /api/v1/analytics/users/{user_id}/timeline` — includes merged visitor ids.
- `GET /api/v1/analytics/visitors/{visitor_id}/timeline` — anonymous visitor journey.

## Rate limits

- Public track: 60 req/min per IP (existing middleware).
- Authenticated track: 600 req/min per bearer token hash.
