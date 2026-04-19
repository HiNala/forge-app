# Calendar & availability debugging

## ICS upload / preview fails

- Confirm the file is UTF-8 text and begins with `BEGIN:VCALENDAR`.
- Very large feeds may hit expansion caps; check `warnings` in the preview API response.
- Malformed series are skipped when `skip_bad_series` is enabled in the parser library path.

## Slots are empty

- Ensure **business hours** JSON covers the weekdays you expect (`0` = Monday … `6` = Sunday).
- Check `min_notice_minutes` and `max_advance_days` — they can silently shrink the visible window.
- Verify busy blocks loaded: `last_sync_summary.busy_block_count` on the calendar row after sync.
- Redis cache TTL is 5 minutes; changing rules or creating holds invalidates cache keys for that calendar.

## ICS URL sync

- Worker cron runs on a fixed schedule and calls `fetch_and_sync_ics_url` with a 30s timeout and 5MB cap.
- `304 Not Modified` responses reuse cached ETag in `metadata.ics_etag` without rewriting blocks.

## Google Calendar

- Event times for automation use `payload.forge_booking` when present (slot start/end from the confirmed hold).
- OAuth lives under **Integrations**; availability calendars are separate from `CalendarConnection` rows used in automations.

## Database

- `slot_holds` overlap constraint requires extension **`btree_gist`**.
