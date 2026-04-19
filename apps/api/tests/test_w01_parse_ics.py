"""Unit tests for ICS parsing (W-01) — no database required."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services.booking_calendar.parse_ics import MAX_EXPANSIONS, parse_ics_to_busy_intervals


def test_parse_minimal_event() -> None:
    ics = """BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:a@b
DTSTAMP:20260110T120000Z
DTSTART:20260115T150000Z
DTEND:20260115T160000Z
END:VEVENT
END:VCALENDAR
"""
    intervals, summary = parse_ics_to_busy_intervals(
        ics.encode(),
        calendar_tz="UTC",
        window_start=datetime(2026, 1, 1, tzinfo=UTC),
        window_end=datetime(2026, 2, 1, tzinfo=UTC),
    )
    assert len(intervals) >= 1
    assert summary.get("busy_block_count", 0) >= 1
    assert summary.get("duration_ms", 0) >= 0


def test_skips_transparent_and_cancelled() -> None:
    ics = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:free1
DTSTART:20260115T100000Z
DTEND:20260115T110000Z
TRANSP:TRANSPARENT
END:VEVENT
BEGIN:VEVENT
UID:cx1
STATUS:CANCELLED
DTSTART:20260115T120000Z
DTEND:20260115T130000Z
END:VEVENT
END:VCALENDAR
"""
    intervals, _ = parse_ics_to_busy_intervals(
        ics,
        window_start=datetime(2026, 1, 1, tzinfo=UTC),
        window_end=datetime(2026, 2, 1, tzinfo=UTC),
    )
    assert len(intervals) == 0


def test_expansion_cap_warning() -> None:
    """Long RRULE windows return bounded work without raising."""
    until = (datetime(2026, 1, 1, tzinfo=UTC) + timedelta(days=400)).strftime("%Y%m%d")
    ics = f"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:daily1
DTSTART:20260101T090000Z
DTEND:20260101T091000Z
RRULE:FREQ=DAILY;UNTIL={until}
END:VEVENT
END:VCALENDAR
"""
    _intervals, summary = parse_ics_to_busy_intervals(
        ics,
        window_start=datetime(2026, 1, 1, tzinfo=UTC),
        window_end=datetime(2027, 1, 1, tzinfo=UTC),
    )
    assert summary.get("event_count", 0) <= MAX_EXPANSIONS + 1
