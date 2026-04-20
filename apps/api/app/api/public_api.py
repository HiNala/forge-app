"""Public (unauthenticated) routes used by generated HTML pages."""

from __future__ import annotations

import json
import logging
import secrets
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ip import get_client_ip
from app.db.models import AnalyticsEvent, Organization, Page, SlotHold, Submission, SubmissionFile
from app.db.rls_context import set_active_organization
from app.deps.db import get_db_public
from app.schemas.availability_calendar import HoldCreateIn, HoldCreateOut, PublicAvailabilityOut
from app.schemas.public_track import TrackBatchIn, TrackBatchOut
from app.schemas.submission import PublicSubmitOut, PublicUploadIn, PublicUploadOut
from app.services.ai.usage import bump_submissions_received
from app.services.analytics.track_public import handle_public_track_batch
from app.services.billing_gate import check_quota
from app.services.booking_calendar.availability import ComputeParams, compute_slots
from app.services.booking_calendar.cache import (
    get_cached_slots,
    invalidate_calendar_availability,
    set_cached_slots,
)
from app.services.booking_calendar.datetime_parse import parse_iso_datetime
from app.services.booking_calendar.page_config import resolve_calendar_for_page
from app.services.public_submission import (
    anonymize_ipv4_to_slash24,
    normalize_submit_fields,
    validate_payload_against_form_schema,
    visitor_fingerprint,
)
from app.services.queue import enqueue_run_automations
from app.services.rate_limit import rate_limit_public_track_event_budget
from app.services.storage_s3 import presigned_put_object, submission_upload_key
from app.services.submission_attachments import (
    collect_file_refs_from_payload,
    field_def_for_name,
    file_field_constraints,
    is_file_field,
    mime_allowed,
    new_upload_token,
    safe_filename,
    upload_bytes_for_field,
    verify_uploaded_file_ref,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/p", tags=["public"])


async def _parse_submit_body_json_or_urlencoded(request: Request) -> dict[str, Any]:
    """Parse JSON or ``application/x-www-form-urlencoded`` (not multipart)."""
    ct = (request.headers.get("content-type") or "").lower()
    if "multipart/form-data" in ct:
        raise HTTPException(status_code=500, detail="internal: use multipart handler")
    if ct.startswith("application/json"):
        try:
            raw = await request.json()
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail="Invalid JSON") from e
        if not isinstance(raw, dict):
            raise HTTPException(status_code=422, detail="JSON object expected")
        return raw
    form = await request.form()
    out: dict[str, Any] = {}
    for k, v in form.items():
        if hasattr(v, "read"):
            raise HTTPException(
                status_code=422,
                detail="File uploads require multipart/form-data.",
            )
        out[str(k)] = v if isinstance(v, str) else str(v)
    return out


@router.get("/{org_slug}/{page_slug}/availability", response_model=PublicAvailabilityOut)
async def public_availability(
    org_slug: str,
    page_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    duration: int | None = Query(None),
    calendar_id: uuid.UUID | None = Query(None),
) -> PublicAvailabilityOut:
    """Public slot list for the Studio/live slot picker (W-01)."""
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")

    await set_active_organization(db, org.id)

    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")

    cal, implied_dur = await resolve_calendar_for_page(
        db, org_id=org.id, page=p, calendar_id=calendar_id
    )
    if cal is None:
        return PublicAvailabilityOut(slots=[], calendar_timezone="UTC")

    dur = duration if duration and duration > 0 else implied_dur
    today = datetime.now(UTC).date()
    d0 = date_from or today
    d1 = date_to or (d0 + timedelta(days=14))

    redis = getattr(request.app.state, "redis", None)
    cached = await get_cached_slots(
        redis, calendar_id=cal.id, date_from=d0, date_to=d1, duration=dur
    )
    if cached is not None:
        return PublicAvailabilityOut(slots=cached, calendar_timezone=cal.timezone)

    params = ComputeParams(
        date_from=d0,
        date_to=d1,
        duration_minutes=dur,
        slot_increment_minutes=cal.slot_increment_minutes,
    )
    slots = await compute_slots(db, calendar=cal, params=params)
    await set_cached_slots(
        redis, calendar_id=cal.id, date_from=d0, date_to=d1, duration=dur, slots=slots
    )
    return PublicAvailabilityOut(slots=slots, calendar_timezone=cal.timezone)


@router.post("/{org_slug}/{page_slug}/availability/hold", response_model=HoldCreateOut)
async def public_hold_create(
    org_slug: str,
    page_slug: str,
    body: HoldCreateIn,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> HoldCreateOut:
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")

    await set_active_organization(db, org.id)

    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")

    cal, _dur = await resolve_calendar_for_page(db, org_id=org.id, page=p, calendar_id=None)
    if cal is None:
        raise HTTPException(status_code=400, detail="Booking is not enabled for this page.")

    try:
        ss = parse_iso_datetime(body.slot_start)
        se = parse_iso_datetime(body.slot_end)
    except ValueError as e:
        raise HTTPException(status_code=422, detail="Invalid slot times") from e
    if ss.tzinfo is None:
        ss = ss.replace(tzinfo=UTC)
    if se.tzinfo is None:
        se = se.replace(tzinfo=UTC)
    ss = ss.astimezone(UTC)
    se = se.astimezone(UTC)

    ip_raw = get_client_ip(request)
    ua = request.headers.get("user-agent")
    fp = visitor_fingerprint(ip_raw, ua)

    expires_at = datetime.now(UTC) + timedelta(minutes=15)
    hold = SlotHold(
        organization_id=org.id,
        calendar_id=cal.id,
        page_id=p.id,
        slot_start=ss,
        slot_end=se,
        status="pending",
        expires_at=expires_at,
        visitor_fingerprint=fp,
    )
    db.add(hold)
    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="That time was just booked — refresh and pick another slot.",
        ) from e

    await invalidate_calendar_availability(getattr(request.app.state, "redis", None), cal.id)
    await db.commit()
    await db.refresh(hold)
    return HoldCreateOut(hold_id=hold.id, expires_at=hold.expires_at)


@router.delete("/{org_slug}/{page_slug}/availability/hold/{hold_id}")
async def public_hold_delete(
    org_slug: str,
    page_slug: str,
    hold_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> dict[str, str]:
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")

    await set_active_organization(db, org.id)

    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")

    row = (
        await db.execute(
            select(SlotHold).where(
                SlotHold.id == hold_id,
                SlotHold.organization_id == org.id,
                SlotHold.page_id == p.id,
                SlotHold.status == "pending",
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")

    row.status = "cancelled"
    await db.commit()
    await invalidate_calendar_availability(
        getattr(request.app.state, "redis", None), row.calendar_id
    )
    return {"status": "cancelled"}


@router.post("/{org_slug}/{page_slug}/submit", response_model=PublicSubmitOut)
async def public_submit(
    org_slug: str,
    page_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> PublicSubmitOut:
    """
    Accept a form submission for a **live** published page.

    Matches the public URL shape ``/p/{org}/{page}`` — same org and page slugs as publish.
    Supports ``application/json``, ``application/x-www-form-urlencoded``, or ``multipart/form-data``
    (files upload to object storage server-side or via prior presigned PUT + JSON refs).
    """
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")

    await set_active_organization(db, org.id)

    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")

    schema_pre = p.form_schema if isinstance(p.form_schema, dict) else None
    ct_hdr = (request.headers.get("content-type") or "").lower()
    if "multipart/form-data" in ct_hdr:
        form = await request.form()
        merged: dict[str, Any] = {}
        file_items: list[tuple[str, Any]] = []
        for key, val in form.multi_items():
            ks = str(key)
            if hasattr(val, "read"):
                file_items.append((ks, val))
            else:
                merged[ks] = val if isinstance(val, str) else str(val)
        for key_s, uv in file_items:
            content = await uv.read()
            if not content:
                raise HTTPException(status_code=400, detail=f"Empty file: {key_s}")
            try:
                ref = upload_bytes_for_field(
                    organization_id=org.id,
                    page_id=p.id,
                    field_name=key_s,
                    content=content,
                    original_filename=getattr(uv, "filename", None) or "upload",
                    content_type=getattr(uv, "content_type", None),
                    form_schema=schema_pre,
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e)) from e
            merged[key_s] = ref
        raw = merged
    else:
        raw = await _parse_submit_body_json_or_urlencoded(request)

    hold_raw = raw.get("hold_id") or raw.get("forge_hold_id")
    hold_uuid: uuid.UUID | None = None
    if hold_raw:
        try:
            hold_uuid = uuid.UUID(str(hold_raw))
        except ValueError:
            hold_uuid = None

    email, name, payload = normalize_submit_fields(raw)

    ip_raw = get_client_ip(request)
    ip_anon = anonymize_ipv4_to_slash24(ip_raw)
    ua = request.headers.get("user-agent")
    fp = visitor_fingerprint(ip_raw, ua)

    hold_row: SlotHold | None = None
    if hold_uuid:
        hold_row = (
            await db.execute(
                select(SlotHold).where(
                    SlotHold.id == hold_uuid,
                    SlotHold.organization_id == org.id,
                    SlotHold.page_id == p.id,
                )
            )
        ).scalar_one_or_none()
        if hold_row is None:
            raise HTTPException(status_code=400, detail="Invalid booking hold.")
        if hold_row.status != "pending":
            raise HTTPException(
                status_code=409,
                detail="That booking slot is no longer available — choose another time.",
            )
        now = datetime.now(UTC)
        exp = hold_row.expires_at
        exp = exp.replace(tzinfo=UTC) if exp.tzinfo is None else exp.astimezone(UTC)
        if exp < now:
            raise HTTPException(
                status_code=409,
                detail="This booking hold expired — choose another time.",
            )
        if hold_row.visitor_fingerprint and hold_row.visitor_fingerprint != fp:
            raise HTTPException(
                status_code=403,
                detail="Booking session mismatch — please select the slot again.",
            )
        payload["forge_booking"] = {
            "slot_start": hold_row.slot_start.astimezone(UTC)
            .isoformat()
            .replace("+00:00", "Z"),
            "slot_end": hold_row.slot_end.astimezone(UTC).isoformat().replace("+00:00", "Z"),
            "calendar_id": str(hold_row.calendar_id),
            "hold_id": str(hold_row.id),
        }

    await check_quota(db, org, "submissions")

    schema = p.form_schema if isinstance(p.form_schema, dict) else None
    ok, reason = validate_payload_against_form_schema(schema, payload)
    if not ok:
        raise HTTPException(status_code=422, detail=reason)

    file_refs = collect_file_refs_from_payload(payload)
    for fname, ref in file_refs:
        ok_f, err_f = verify_uploaded_file_ref(
            organization_id=org.id,
            page_id=p.id,
            field_name=fname,
            ref=ref,
            form_schema=schema,
        )
        if not ok_f:
            raise HTTPException(status_code=422, detail=err_f)

    booking_token = secrets.token_urlsafe(32) if payload.get("forge_booking") else None

    sub = Submission(
        organization_id=org.id,
        page_id=p.id,
        page_version_id=p.published_version_id,
        payload=payload,
        submitter_email=email,
        submitter_name=name,
        source_ip=ip_anon,
        user_agent=(ua[:4000] if ua else None),
        booking_token=booking_token,
    )
    db.add(sub)
    await db.flush()

    for fname, ref in file_refs:
        db.add(
            SubmissionFile(
                submission_id=sub.id,
                organization_id=org.id,
                field_name=fname,
                storage_key=str(ref["storage_key"]),
                file_name=str(ref["file_name"]),
                content_type=str(ref["content_type"]) if ref.get("content_type") else None,
                size_bytes=int(ref["size_bytes"]) if ref.get("size_bytes") is not None else None,
            )
        )
    if file_refs:
        await db.flush()

    if hold_row is not None:
        hold_row.submission_id = sub.id
        hold_row.status = "confirmed"
        await db.flush()
        await invalidate_calendar_availability(
            getattr(request.app.state, "redis", None), hold_row.calendar_id
        )

    vid = visitor_fingerprint(ip_raw, ua)
    ref = request.headers.get("referer") or request.headers.get("referrer")
    ev = AnalyticsEvent(
        organization_id=org.id,
        page_id=p.id,
        event_type="form_submit_success",
        visitor_id=vid,
        session_id=uuid.uuid4().hex,
        metadata_={"submission_id": str(sub.id)},
        source_ip=ip_anon,
        user_agent=(ua[:4000] if ua else None),
        referrer=ref[:2000] if ref else None,
    )
    db.add(ev)
    await bump_submissions_received(db, org.id)

    try:
        await db.commit()
    except Exception as e:
        logger.exception("public_submit_commit %s", e)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Could not save submission") from e

    await enqueue_run_automations(request.app.state, str(sub.id))

    return PublicSubmitOut()


@router.get("/{org_slug}/{page_slug}/bookings/{booking_token}")
async def public_booking_detail(
    org_slug: str,
    page_slug: str,
    booking_token: str,
    db: AsyncSession = Depends(get_db_public),
) -> dict[str, Any]:
    """Resolve booking details for a magic-link token (W-01)."""
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")

    await set_active_organization(db, org.id)

    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")

    sub = (
        await db.execute(
            select(Submission).where(
                Submission.organization_id == org.id,
                Submission.page_id == p.id,
                Submission.booking_token == booking_token,
            )
        )
    ).scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Not found")

    fb = sub.payload.get("forge_booking") if isinstance(sub.payload, dict) else None
    if not isinstance(fb, dict):
        raise HTTPException(status_code=404, detail="Not found")

    hold = (
        await db.execute(
            select(SlotHold).where(
                SlotHold.submission_id == sub.id,
                SlotHold.organization_id == org.id,
            )
        )
    ).scalar_one_or_none()

    return {
        "page_title": p.title,
        "submitter_email": sub.submitter_email,
        "slot_start": fb.get("slot_start"),
        "slot_end": fb.get("slot_end"),
        "hold_status": hold.status if hold else None,
        "reschedule_url": f"/p/{org_slug}/{page_slug}",
        "cancel_url": f"/p/{org_slug}/{page_slug}/bookings/{booking_token}/cancel",
    }


@router.post("/{org_slug}/{page_slug}/bookings/{booking_token}/cancel")
async def public_booking_cancel(
    org_slug: str,
    page_slug: str,
    booking_token: str,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> dict[str, str]:
    """Cancel a confirmed booking (magic link)."""
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")

    await set_active_organization(db, org.id)

    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")

    sub = (
        await db.execute(
            select(Submission).where(
                Submission.organization_id == org.id,
                Submission.page_id == p.id,
                Submission.booking_token == booking_token,
            )
        )
    ).scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Not found")

    hold = (
        await db.execute(
            select(SlotHold).where(
                SlotHold.submission_id == sub.id,
                SlotHold.organization_id == org.id,
                SlotHold.status == "confirmed",
            )
        )
    ).scalar_one_or_none()
    if hold is not None:
        hold.status = "cancelled"
        await invalidate_calendar_availability(
            getattr(request.app.state, "redis", None), hold.calendar_id
        )
    await db.commit()
    return {"status": "cancelled"}


@router.post("/{org_slug}/{page_slug}/upload", response_model=PublicUploadOut)
async def public_upload(
    org_slug: str,
    page_slug: str,
    body: PublicUploadIn,
    db: AsyncSession = Depends(get_db_public),
) -> PublicUploadOut:
    """Presigned PUT for direct browser → S3 upload (Mission 04)."""
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")
    await set_active_organization(db, org.id)
    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")
    schema = p.form_schema if isinstance(p.form_schema, dict) else None
    fd = field_def_for_name(schema, body.field_name)
    if fd is None or not is_file_field(fd):
        raise HTTPException(status_code=400, detail="Invalid or non-file field")
    max_b, allowed = file_field_constraints(fd)
    if body.size_bytes > max_b:
        raise HTTPException(status_code=400, detail="File too large for this field")
    ct = body.content_type.split(";")[0].strip()
    if not mime_allowed(ct, None, allowed):
        raise HTTPException(status_code=400, detail="Content type not allowed for this field")
    token = new_upload_token()
    fn = safe_filename(body.file_name)
    key = submission_upload_key(
        organization_id=org.id,
        page_id=p.id,
        upload_token=token,
        filename=fn,
    )
    url = presigned_put_object(key=key, content_type=ct, expires_in=3600)
    return PublicUploadOut(upload_url=url, storage_key=key, expires_in=3600)


@router.post("/{org_slug}/{page_slug}/track", response_model=TrackBatchOut)
async def public_track(
    org_slug: str,
    page_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> TrackBatchOut:
    """Batch analytics beacon (up to 10 events per request) for a live published page."""
    try:
        raw = await request.json()
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail="Invalid JSON") from e
    try:
        batch = TrackBatchIn.model_validate(raw)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    await rate_limit_public_track_event_budget(request, len(batch.events))

    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")

    await set_active_organization(db, org.id)

    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")

    try:
        return await handle_public_track_batch(
            db=db,
            request=request,
            org=org,
            page=p,
            batch=batch,
            redis=getattr(request.app.state, "redis", None),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("public_track %s", e)
        raise HTTPException(status_code=500, detail="Could not save events") from e
