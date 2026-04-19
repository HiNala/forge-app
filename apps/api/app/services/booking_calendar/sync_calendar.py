"""Apply ICS bytes to calendar_busy_blocks (W-01)."""

from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AvailabilityCalendar, CalendarBusyBlock
from app.services.booking_calendar.cache import invalidate_calendar_availability
from app.services.booking_calendar.parse_ics import parse_ics_to_busy_intervals


async def replace_busy_blocks_from_ics(
    db: AsyncSession,
    *,
    calendar: AvailabilityCalendar,
    ics_bytes: bytes,
    redis: Any = None,
) -> dict[str, Any]:
    """Wipe busy blocks for calendar, re-insert from ICS. Updates ``last_sync_summary``."""
    t0 = time.perf_counter()
    window_start = datetime.now(UTC)
    window_end = window_start + timedelta(days=183)
    intervals, summary = parse_ics_to_busy_intervals(
        ics_bytes,
        calendar_tz=calendar.timezone or "UTC",
        all_day_blocks_full_day=calendar.all_day_events_block,
        window_start=window_start,
        window_end=window_end,
    )
    await db.execute(delete(CalendarBusyBlock).where(CalendarBusyBlock.calendar_id == calendar.id))
    for s, e, uid, meta in intervals:
        db.add(
            CalendarBusyBlock(
                calendar_id=calendar.id,
                starts_at=s,
                ends_at=e,
                source_uid=uid,
                metadata_=meta,
            )
        )
    duration_ms = int((time.perf_counter() - t0) * 1000)
    full_summary: dict[str, Any] = {
        **summary,
        "busy_block_count": len(intervals),
        "duration_ms": duration_ms,
    }
    calendar.last_synced_at = datetime.now(UTC)
    calendar.last_sync_summary = full_summary
    await db.flush()
    await invalidate_calendar_availability(redis, calendar.id)
    return full_summary


async def fetch_and_sync_ics_url(
    db: AsyncSession,
    *,
    calendar: AvailabilityCalendar,
    redis: Any = None,
    timeout_s: float = 30.0,
    max_body_bytes: int = 5 * 1024 * 1024,
) -> dict[str, Any]:
    """GET ICS from ``calendar.source_ref``, handle 304 via ETag in metadata."""
    import httpx

    url = (calendar.source_ref or "").strip()
    if not url:
        return {"ok": False, "error": "missing_source_ref"}

    meta = dict(calendar.metadata_ or {})
    etag = meta.get("ics_etag")
    headers: dict[str, str] = {}
    if etag:
        headers["If-None-Match"] = etag

    async with httpx.AsyncClient(timeout=timeout_s, follow_redirects=True) as client:
        r = await client.get(url, headers=headers)

    if r.status_code == 304:
        return {"ok": True, "not_modified": True}

    if r.status_code >= 400:
        return {"ok": False, "error": f"http_{r.status_code}"}

    body = r.content
    if len(body) > max_body_bytes:
        return {"ok": False, "error": "body_too_large"}

    new_etag = r.headers.get("etag") or r.headers.get("ETag")
    if new_etag:
        meta["ics_etag"] = new_etag
    calendar.metadata_ = meta

    out = await replace_busy_blocks_from_ics(db, calendar=calendar, ics_bytes=body, redis=redis)
    out["ok"] = True
    return out
