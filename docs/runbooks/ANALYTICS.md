# Analytics (`analytics_events`)

## Partitions and retention

- Events are stored in `analytics_events` (partitioned by month in production-style deployments).
- The worker job `purge_old_analytics` / `drop_old_analytics_partitions` removes data older than the plan retention window (default 90 days; Pro 180; Enterprise 365 — see `billing_plans` / worker implementation).
- Changing retention: update plan constants and ensure the worker runs daily (arq/cron).

## Caching

- Page and org summary responses are cached in Redis (≈5 minute TTL). Keys are busted on publish (`bust_page_and_org`).
- If summaries look stale after heavy traffic, wait one TTL or trigger a republish to invalidate.

## Debugging missing events

1. **Public track**: `POST /p/{org_slug}/{page_slug}/track` accepts batches (max 10). Rate limit: 60 events/min/IP on track; POST submit/upload use a separate bucket (see `middleware/rate_limit.py`).
2. **Published HTML**: the tracker is injected at serve time (`forge_tracker.js`); stored HTML in the database stays script-free.
3. **Visitor/session**: first-party cookie for `visitor_id`; session rotation and event types are documented in Mission 06 / `forge_tracker` source.
4. **DB**: query `analytics_events` for `organization_id`, `page_id`, `event_type`, and `created_at`. Ensure RLS tenant context matches when using the app DB console.

## Heavy queries

- Aggregation SQL lives in `app/services/analytics_service.py`. For large partitions, use `EXPLAIN ANALYZE` in Postgres before changing indexes.
