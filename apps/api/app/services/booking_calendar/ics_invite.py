"""Build text/calendar ICS bytes for booking confirmations (W-01)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any


def build_booking_invite_ics(
    *,
    uid_domain: str,
    organizer_name: str,
    organizer_email: str | None,
    attendee_name: str | None,
    attendee_email: str | None,
    slot_start: datetime,
    slot_end: datetime,
    summary: str,
    description: str,
    location: str | None = None,
) -> bytes:
    """Minimal VEVENT ICS (UTC datetimes) suitable for email attachments."""

    def fmt(dt: datetime) -> str:
        u = dt.astimezone(UTC)
        return u.strftime("%Y%m%dT%H%M%SZ")

    uid = f"{uuid.uuid4()}@{uid_domain}"
    desc = description.replace("\r", "").replace("\n", "\\n")
    org_mail = organizer_email or "noreply@forge.local"
    att = attendee_email or ""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//GlideDesign//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{fmt(datetime.now(UTC))}",
        f"DTSTART:{fmt(slot_start)}",
        f"DTEND:{fmt(slot_end)}",
        f"SUMMARY:{_fold_ics_text(summary)}",
        f"DESCRIPTION:{_fold_ics_text(desc)}",
        f"ORGANIZER;CN={_escape_param(organizer_name)}:MAILTO:{org_mail}",
    ]
    if att:
        cn = _escape_param(attendee_name or "Guest")
        lines.append(f"ATTENDEE;CN={cn};RSVP=TRUE:MAILTO:{att}")
    if location:
        lines.append(f"LOCATION:{_fold_ics_text(location)}")
    lines.extend(
        [
            "STATUS:CONFIRMED",
            "SEQUENCE:0",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
    )
    return ("\r\n".join(lines) + "\r\n").encode("utf-8")


def _escape_param(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", r"\;").replace(",", r"\,")


def _fold_ics_text(s: str) -> str:
    return s.replace("\r", "").replace("\n", " ")


def slot_readable_preview(payload: dict[str, Any], tz_name: str | None = None) -> str:
    """Human line for email subjects from forge_booking payload."""
    fb = payload.get("forge_booking")
    if not isinstance(fb, dict):
        return "New submission"
    raw_s = fb.get("slot_start")
    if not raw_s:
        return "New booking"
    try:
        from app.services.booking_calendar.datetime_parse import parse_iso_datetime

        dt = parse_iso_datetime(str(raw_s))
        if tz_name:
            try:
                from zoneinfo import ZoneInfo

                loc = dt.astimezone(ZoneInfo(tz_name))
            except Exception:  # noqa: BLE001
                loc = dt.astimezone(UTC)
        else:
            loc = dt.astimezone(UTC)
        return loc.strftime("%a %b %d, %I:%M %p").lstrip("0").replace(" 0", " ")
    except Exception:  # noqa: BLE001
        return "Booked time"
