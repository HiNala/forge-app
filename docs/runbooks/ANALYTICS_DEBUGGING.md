# Analytics debugging

## Events not appearing

1. **400 on ingest** — Read the response body. Common causes: unknown `event_type`, missing required metadata (see `EventDefinition.required_properties` in `apps/api/app/services/analytics/events.py`), or invalid `page_id` for the active org on authenticated track.
2. **Rate limit (429)** — Public track is limited per IP; authenticated per user. Response may include `Retry-After`.
3. **Dedupe** — Same `client_event_id` within the Redis TTL is skipped silently.
4. **Backpressure** — Under extreme load the ingestion queue may drop; check logs/metrics for `analytics.backpressure_drop` pattern.

## Database

- Confirm migration `g101_gl01_engagement_analytics` (or later head) is applied: `alembic current` from `apps/api`.
- Partitioned table: time-range queries must include `created_at` predicates for planner efficiency.

## Redis

- Dedupe keys are date-scoped; if Redis is empty, dedupe is skipped (duplicates possible).

## Reprocessing

- There is no automatic re-ingest from access logs; fix forward at the client or backfill with a one-off script scoped by org (respect RLS).
