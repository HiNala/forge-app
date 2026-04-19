"""Parse ICS files into busy intervals (W-01)."""

from __future__ import annotations

import logging
import time
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from datetime import time as dt_time
from typing import Any
from zoneinfo import ZoneInfo

import recurring_ical_events
from icalendar import Calendar

logger = logging.getLogger(__name__)

MAX_EXPANSIONS = 10_000


def _to_utc_bounds(
    dt: datetime | date, default_tz: ZoneInfo
) -> tuple[datetime, datetime] | None:
    if isinstance(dt, date) and not isinstance(dt, datetime):
        day = dt
        start = datetime.combine(day, dt_time.min, tzinfo=default_tz)
        end = start + timedelta(days=1)
        return start.astimezone(UTC), end.astimezone(UTC)
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=default_tz)
        return dt.astimezone(UTC), dt.astimezone(UTC)
    return None


def suggest_business_hours_from_intervals(
    intervals: list[tuple[datetime, datetime, str | None, dict[str, Any]]],
    *,
    calendar_tz: str,
) -> dict[str, list[list[str]]]:
    """Heuristic weekday hour buckets (9–17) from busy block local hours (W-01 preview)."""
    tz = ZoneInfo(calendar_tz)
    weekday_hours: Counter[int] = Counter()
    for s, _, _, meta in intervals:
        if meta.get("all_day"):
            continue
        loc = s.astimezone(tz)
        w = loc.weekday()
        weekday_hours[w] += 1
    active_weekdays = {w for w, c in weekday_hours.items() if c > 0}
    if not active_weekdays:
        return {str(i): [["09:00", "17:00"]] for i in range(5)}
    out: dict[str, list[list[str]]] = {}
    for i in range(7):
        if i in active_weekdays or i < 5:
            out[str(i)] = [["09:00", "17:00"]]
    return out


def parse_ics_to_busy_intervals(
    content: bytes | str,
    *,
    calendar_tz: str = "UTC",
    all_day_blocks_full_day: bool = True,
    window_start: datetime | None = None,
    window_end: datetime | None = None,
) -> tuple[list[tuple[datetime, datetime, str | None, dict[str, Any]]], dict[str, Any]]:
    """
    Returns (intervals, summary) where each interval is (start_utc, end_utc, uid, meta).

    Summary includes ``business_hours_suggested`` for preview UI.
    """
    t0 = time.perf_counter()
    raw = content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content
    try:
        cal = Calendar.from_ical(raw)
    except Exception as parse_err:
        logger.warning("parse_ics: invalid calendar: %s", parse_err)
        dur = int((time.perf_counter() - t0) * 1000)
        return [], {
            "event_count": 0,
            "busy_block_count": 0,
            "warnings": [f"invalid_calendar: {parse_err}"],
            "duration_ms": dur,
        }

    tz = ZoneInfo(calendar_tz) if calendar_tz else UTC
    if window_start is None:
        window_start = datetime.now(UTC)
    if window_end is None:
        window_end = window_start + timedelta(days=183)

    ws = window_start.astimezone(UTC).replace(tzinfo=None)
    we = window_end.astimezone(UTC).replace(tzinfo=None)

    warnings: list[str] = []
    intervals: list[tuple[datetime, datetime, str | None, dict[str, Any]]] = []
    expansion_count = 0

    try:
        collector = recurring_ical_events.of(cal, skip_bad_series=True)
        between_events = collector.between(ws, we)
    except Exception as series_err:
        logger.warning("recurring_ical_events failed: %s", series_err)
        dur = int((time.perf_counter() - t0) * 1000)
        return [], {
            "event_count": 0,
            "warnings": [str(series_err)],
            "busy_block_count": 0,
            "duration_ms": dur,
        }

    for comp in between_events:
        try:
            expansion_count += 1
            if expansion_count > MAX_EXPANSIONS:
                warnings.append("expansion_cap_reached")
                break

            status = str(comp.get("status") or comp.get("STATUS") or "").upper()
            if status == "CANCELLED":
                continue

            transp = str(comp.get("transp") or comp.get("TRANSP") or "").upper()
            if transp == "TRANSPARENT":
                continue

            uid = str(comp.get("uid") or comp.get("UID") or "") or None
            dtstart = comp.decoded("DTSTART")
            dtend = comp.decoded("DTEND") if "DTEND" in comp else None

            tzid = None
            try:
                ts = comp.get("DTSTART")
                if ts is not None and getattr(ts, "params", None):
                    tzid = ts.params.get("TZID")
            except Exception:  # noqa: BLE001
                tzid = None

            meta: dict[str, Any] = {
                "status": status or None,
                "transp": transp or None,
                "tzid": tzid,
            }

            if isinstance(dtstart, datetime):
                start_loc = dtstart if dtstart.tzinfo else dtstart.replace(tzinfo=tz)
                if dtend is None:
                    end_loc = start_loc + timedelta(hours=1)
                elif isinstance(dtend, datetime):
                    end_loc = dtend if dtend.tzinfo else dtend.replace(tzinfo=tz)
                else:
                    end_loc = start_loc + timedelta(hours=1)
                start_utc = start_loc.astimezone(UTC)
                end_utc = end_loc.astimezone(UTC)
                if end_utc <= start_utc:
                    continue
                meta["all_day"] = False
                intervals.append((start_utc, end_utc, uid, meta))
                continue

            if isinstance(dtstart, date):
                if not all_day_blocks_full_day:
                    continue
                day = dtstart
                if isinstance(dtend, date) and dtend > day:  # noqa: SIM108
                    end_day = dtend
                else:
                    end_day = day + timedelta(days=1)
                start_utc = datetime.combine(day, dt_time.min, tzinfo=tz).astimezone(UTC)
                end_utc = datetime.combine(end_day, dt_time.min, tzinfo=tz).astimezone(UTC)
                meta["all_day"] = True
                intervals.append((start_utc, end_utc, uid, meta))
                continue

        except Exception as exc:
            warnings.append(f"skip_malformed_event:{exc}")
            continue

    duration_ms = int((time.perf_counter() - t0) * 1000)
    bh = suggest_business_hours_from_intervals(intervals, calendar_tz=calendar_tz)
    summary = {
        "event_count": expansion_count,
        "busy_block_count": len(intervals),
        "recurrence_expansions": expansion_count,
        "warnings": warnings,
        "duration_ms": duration_ms,
        "business_hours_suggested": bh,
    }
    return intervals, summary
