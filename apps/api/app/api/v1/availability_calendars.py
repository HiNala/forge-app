"""Availability calendars CRUD + ICS preview (W-01)."""

from __future__ import annotations

import logging
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AvailabilityCalendar, User
from app.deps import get_db, require_tenant
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.availability_calendar import (
    AvailabilityCalendarCreate,
    AvailabilityCalendarOut,
    AvailabilityCalendarPatch,
    PreviewIcsResponse,
)
from app.services.booking_calendar.cache import invalidate_calendar_availability
from app.services.booking_calendar.parse_ics import parse_ics_to_busy_intervals
from app.services.booking_calendar.sync_calendar import replace_busy_blocks_from_ics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/availability-calendars", tags=["availability-calendars"])


def _to_out(row: AvailabilityCalendar) -> AvailabilityCalendarOut:
    return AvailabilityCalendarOut.model_validate(row)


@router.get("", response_model=list[AvailabilityCalendarOut])
async def list_calendars(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> list[AvailabilityCalendarOut]:
    del user
    q = await db.execute(
        select(AvailabilityCalendar)
        .where(AvailabilityCalendar.organization_id == ctx.organization_id)
        .order_by(AvailabilityCalendar.created_at.asc())
    )
    rows = q.scalars().all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=AvailabilityCalendarOut)
async def create_calendar(
    body: AvailabilityCalendarCreate,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> AvailabilityCalendarOut:
    del user
    row = AvailabilityCalendar(
        organization_id=ctx.organization_id,
        name=body.name,
        source_type=body.source_type,
        source_ref=body.source_ref,
        timezone=body.timezone or "UTC",
        business_hours={},
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_out(row)


@router.post("/preview-ics", response_model=PreviewIcsResponse)
async def preview_ics(
    file: Annotated[UploadFile, File(...)],
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> PreviewIcsResponse:
    """Parse-only preview for uploaded .ics (creator flow)."""
    del db, ctx, user
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="Empty file")
    _, summary = parse_ics_to_busy_intervals(raw)
    return PreviewIcsResponse(
        event_count=int(summary.get("event_count", 0)),
        busy_block_count=int(summary.get("busy_block_count", 0)),
        recurrence_expansions=int(summary.get("recurrence_expansions", 0)),
        warnings=list(summary.get("warnings") or []),
        duration_ms=int(summary.get("duration_ms", 0)),
        business_hours_suggested=summary.get("business_hours_suggested") or {},
        date_range_note=None,
    )


@router.patch("/{calendar_id}", response_model=AvailabilityCalendarOut)
async def patch_calendar(
    calendar_id: UUID,
    body: AvailabilityCalendarPatch,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> AvailabilityCalendarOut:
    del user
    row = (
        await db.execute(
            select(AvailabilityCalendar).where(
                AvailabilityCalendar.id == calendar_id,
                AvailabilityCalendar.organization_id == ctx.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")

    data = body.model_dump(exclude_none=True)
    if "metadata" in data:
        data["metadata_"] = data.pop("metadata")

    for k, v in data.items():
        setattr(row, k, v)

    await db.flush()
    await db.commit()
    await db.refresh(row)
    await invalidate_calendar_availability(getattr(request.app.state, "redis", None), calendar_id)
    return _to_out(row)


@router.post("/{calendar_id}/sync", response_model=dict)
async def sync_calendar_manual(
    calendar_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> dict[str, Any]:
    """Upload not used — triggers re-fetch for ics_url or expects file elsewhere."""
    del user
    row = (
        await db.execute(
            select(AvailabilityCalendar).where(
                AvailabilityCalendar.id == calendar_id,
                AvailabilityCalendar.organization_id == ctx.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    if row.source_type != "ics_url" or not row.source_ref:
        raise HTTPException(status_code=400, detail="Calendar is not an ICS URL subscription")
    from app.services.booking_calendar.sync_calendar import fetch_and_sync_ics_url

    out = await fetch_and_sync_ics_url(
        db, calendar=row, redis=getattr(request.app.state, "redis", None)
    )
    await db.commit()
    return out


@router.post("/{calendar_id}/upload-ics", response_model=dict)
async def upload_ics_replace(
    calendar_id: UUID,
    file: Annotated[UploadFile, File(...)],
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> dict[str, Any]:
    del user
    row = (
        await db.execute(
            select(AvailabilityCalendar).where(
                AvailabilityCalendar.id == calendar_id,
                AvailabilityCalendar.organization_id == ctx.organization_id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=422, detail="Empty file")
    row.source_type = "ics_file"
    summary = await replace_busy_blocks_from_ics(
        db, calendar=row, ics_bytes=raw, redis=getattr(request.app.state, "redis", None)
    )
    await db.commit()
    return summary
