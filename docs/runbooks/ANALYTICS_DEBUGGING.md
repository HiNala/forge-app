# Analytics debugging

## Events not appearing

1. Confirm the request returns 200 and `accepted` matches non-deduped events.
2. Check validation error (400) — missing required `metadata` keys for the `event_type`.
3. **Test environment**: ingestion uses synchronous inserts; production uses the background consumer — verify the FastAPI process is healthy and not logging `analytics batch flush failed`.
4. **Redis dedupe**: duplicate `client_event_id` values within ~25h are skipped silently.
5. **DNT**: `Dnt: 1` on public track returns `accepted: 0`.

## Queue / backpressure

- Metric: `analytics_backpressure_drop_total`.
- Logs: `analytics ingestion queue full; dropped oldest event`.

## Retention MV stale

- Worker job `refresh_retention_views` runs daily (arq cron). Manual SQL: `REFRESH MATERIALIZED VIEW retention_signup_weekly;` (superuser / maintenance role).

## Reprocessing

No automatic re-ingest from access logs today; replay would require raw request bodies. For recovery, use org-scoped exports once implemented.
