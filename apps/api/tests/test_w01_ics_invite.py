"""W-01 — ICS attachment bytes for booking emails."""

from __future__ import annotations

from datetime import UTC, datetime

from app.services.booking_calendar.ics_invite import build_booking_invite_ics


def test_build_booking_invite_ics_contains_vevent() -> None:
    a = datetime(2026, 6, 1, 15, 0, tzinfo=UTC)
    b = datetime(2026, 6, 1, 15, 30, tzinfo=UTC)
    raw = build_booking_invite_ics(
        uid_domain="test.local",
        organizer_name="Org",
        organizer_email="org@example.com",
        attendee_name="Dan",
        attendee_email="dan@example.com",
        slot_start=a,
        slot_end=b,
        summary="Consultation",
        description="Booked via Forge",
        location="Shop",
    )
    assert b"BEGIN:VCALENDAR" in raw
    assert b"BEGIN:VEVENT" in raw
    assert b"ORGANIZER" in raw
    assert b"ATTENDEE" in raw
    assert b"20260601T150000Z" in raw
