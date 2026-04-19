"""Google Calendar event creation (Mission 05)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import CalendarConnection
from app.services.token_crypto import decrypt_text, encrypt_text

logger = logging.getLogger(__name__)

CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"


def _credentials_from_connection(conn: CalendarConnection) -> Credentials:
    token = decrypt_text(conn.access_token_encrypted)
    refresh = decrypt_text(conn.refresh_token_encrypted) if conn.refresh_token_encrypted else None
    return Credentials(
        token=token,
        refresh_token=refresh,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
        client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
        scopes=[CALENDAR_SCOPE],
    )  # type: ignore[no-untyped-call]


async def refresh_and_persist(
    db: AsyncSession,
    conn: CalendarConnection,
) -> Credentials:
    creds = _credentials_from_connection(conn)
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception as e:
            conn.last_error = f"refresh_failed:{e!s}"
            await db.commit()
            raise
        conn.access_token_encrypted = encrypt_text(creds.token or "")
        if creds.refresh_token:
            conn.refresh_token_encrypted = encrypt_text(creds.refresh_token)
        conn.token_expires_at = creds.expiry.replace(tzinfo=UTC) if creds.expiry else None
        conn.last_error = None
        conn.last_used_at = datetime.now(UTC)
        await db.commit()
    return creds


def _format_description(payload: dict[str, Any]) -> str:
    lines: list[str] = []
    for k, v in sorted(payload.items()):
        lines.append(f"{k}: {v}")
    return "\n".join(lines) if lines else "(no fields)"


def _event_start_end(
    *,
    submitted_at: datetime,
    payload: dict[str, Any],
    duration_min: int,
) -> tuple[datetime, datetime]:
    fb = payload.get("forge_booking")
    if isinstance(fb, dict) and fb.get("slot_start") and fb.get("slot_end"):
        from app.services.booking_calendar.datetime_parse import parse_iso_datetime

        s = parse_iso_datetime(str(fb["slot_start"]))
        e = parse_iso_datetime(str(fb["slot_end"]))
        return s.astimezone(UTC), e.astimezone(UTC)

    start = (
        submitted_at.replace(tzinfo=UTC)
        if submitted_at.tzinfo is None
        else submitted_at.astimezone(UTC)
    )

    preferred = None
    for key in ("preferred_date", "preferred_time", "event_date", "date"):
        raw = payload.get(key)
        if isinstance(raw, str) and raw.strip():
            preferred = raw.strip()
            break
    if preferred:
        try:
            if "T" in preferred:
                start = datetime.fromisoformat(preferred.replace("Z", "+00:00")).astimezone(UTC)
            else:
                d = datetime.strptime(preferred[:10], "%Y-%m-%d").date()
                start = datetime(d.year, d.month, d.day, tzinfo=UTC) + timedelta(days=1)
        except ValueError:
            start = submitted_at.astimezone(UTC) + timedelta(days=1)
    else:
        start = submitted_at.astimezone(UTC) + timedelta(days=1)

    end = start + timedelta(minutes=max(duration_min, 15))
    return start, end


async def create_event_for_submission(
    db: AsyncSession,
    *,
    conn: CalendarConnection,
    page_title: str,
    submitter_name: str | None,
    submitter_email: str | None,
    payload: dict[str, Any],
    submitted_at: datetime,
    duration_min: int,
    send_invite: bool,
) -> dict[str, Any]:
    """Create a calendar event; returns ids/links for AutomationRun.result_json."""
    creds = await refresh_and_persist(db, conn)
    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    start, end = _event_start_end(
        submitted_at=submitted_at,
        payload=payload,
        duration_min=duration_min,
    )
    summary = f"{page_title} — {submitter_name or 'Lead'}"
    body: dict[str, Any] = {
        "summary": summary,
        "description": _format_description(payload),
        "start": {
            "dateTime": start.isoformat().replace("+00:00", "Z"),
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": end.isoformat().replace("+00:00", "Z"),
            "timeZone": "UTC",
        },
    }
    if send_invite and submitter_email:
        body["attendees"] = [{"email": submitter_email}]

    send_updates = "all" if send_invite and submitter_email else None

    try:
        if send_updates:
            created = (
                service.events()
                .insert(
                    calendarId=conn.calendar_id or "primary",
                    body=body,
                    sendUpdates=send_updates,
                )
                .execute()
            )
        else:
            created = (
                service.events()
                .insert(calendarId=conn.calendar_id or "primary", body=body)
                .execute()
            )
    except HttpError as e:
        if e.resp.status in (429, 500, 503):
            logger.warning("google calendar transient %s", e)
        raise

    return {
        "event_id": created.get("id"),
        "html_link": created.get("htmlLink"),
        "hangout_link": created.get("hangoutLink"),
    }
