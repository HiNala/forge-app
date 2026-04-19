"""Resolve booking calendar + duration from page metadata (W-01)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AvailabilityCalendar, Page


async def resolve_calendar_for_page(
    db: AsyncSession,
    *,
    org_id: UUID,
    page: Page,
    calendar_id: UUID | None,
) -> tuple[AvailabilityCalendar | None, int]:
    """Pick availability calendar and slot duration for a published page."""
    duration = 30
    cal_uuid: UUID | None = calendar_id
    intent = page.intent_json if isinstance(page.intent_json, dict) else None
    form = page.form_schema if isinstance(page.form_schema, dict) else None
    if intent:
        b = intent.get("booking")
        if isinstance(b, dict):
            if b.get("duration_minutes"):
                duration = int(b["duration_minutes"])
            if not cal_uuid and b.get("calendar_id"):
                cal_uuid = UUID(str(b["calendar_id"]))
    if form:
        fb = form.get("forge_booking")
        if isinstance(fb, dict):
            if fb.get("duration_minutes"):
                duration = int(fb["duration_minutes"])
            if not cal_uuid and fb.get("calendar_id"):
                cal_uuid = UUID(str(fb["calendar_id"]))
    if cal_uuid:
        row = (
            await db.execute(
                select(AvailabilityCalendar).where(
                    AvailabilityCalendar.id == cal_uuid,
                    AvailabilityCalendar.organization_id == org_id,
                )
            )
        ).scalar_one_or_none()
        return row, duration
    row = (
        await db.execute(
            select(AvailabilityCalendar)
            .where(AvailabilityCalendar.organization_id == org_id)
            .order_by(AvailabilityCalendar.created_at.asc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if row:
        duration = row.slot_duration_minutes
    return row, duration
