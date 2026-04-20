"""Public POST /p/.../track and authenticated /analytics/track batch handlers."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, Request
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CustomEventDefinition, Organization, Page, User
from app.schemas.public_track import TrackBatchIn, TrackBatchOut
from app.services.analytics.enrich import client_ip, enrich_from_request, referrer_hostname
from app.services.analytics.events import validate_event_payload
from app.services.analytics.ingestion import (
    enqueue_event_row,
    enqueue_event_row_sync,
    flush_policy_immediate,
    row_from_parts,
)
from app.services.public_submission import anonymize_ipv4_to_slash24

logger = logging.getLogger(__name__)


def _workflow_for_page_type(page_type: str) -> str | None:
    m = {
        "contact-form": "contact_form",
        "booking-form": "booking",
        "rsvp": "rsvp",
        "proposal": "proposal",
        "pitch-deck": "pitch_deck",
    }
    return m.get(page_type)


async def _custom_event_names(db: AsyncSession, organization_id: UUID) -> frozenset[str]:
    rows = (
        await db.execute(
            select(CustomEventDefinition.name).where(CustomEventDefinition.organization_id == organization_id)
        )
    ).all()
    return frozenset(str(r[0]) for r in rows)


async def _dedupe_skip(redis: Redis | None, client_event_id: str | None) -> bool:
    """Return True if duplicate (skip insert)."""
    if redis is None or not client_event_id:
        return False
    day = datetime.now(UTC).strftime("%Y%m%d")
    key = f"forge:evdedupe:{day}:{client_event_id[:200]}"
    try:
        res = await redis.set(key, "1", nx=True, ex=90000)
        return res is None
    except Exception as e:  # noqa: BLE001
        logger.debug("dedupe redis miss: %s", e)
        return False


async def handle_public_track_batch(
    *,
    db: AsyncSession,
    request: Request,
    org: Organization,
    page: Page,
    batch: TrackBatchIn,
    redis: Redis | None,
) -> TrackBatchOut:
    if request.headers.get("dnt") == "1":
        return TrackBatchOut(ok=True, accepted=0)

    custom_names = await _custom_event_names(db, org.id)
    ip_anon = anonymize_ipv4_to_slash24(client_ip(request))
    ua = request.headers.get("user-agent")
    ref = request.headers.get("referer") or request.headers.get("referrer")
    ref_dom = referrer_hostname(ref[:2000] if ref else None)
    now = datetime.now(UTC)
    wf = _workflow_for_page_type(page.page_type)
    accepted = 0

    for ev in batch.events:
        md_raw = dict(ev.metadata or {})
        md_raw.setdefault("page_id", str(page.id))
        ok, err = validate_event_payload(ev.event_type, md_raw, custom_names=custom_names)
        if not ok:
            raise HTTPException(status_code=400, detail=err or "invalid event")
        if await _dedupe_skip(redis, ev.client_event_id):
            continue
        extra = enrich_from_request(request, md_raw)
        row = row_from_parts(
            organization_id=org.id,
            page_id=page.id,
            event_type=ev.event_type,
            visitor_id=ev.visitor_id,
            session_id=ev.session_id,
            metadata=_trim_metadata_dict(md_raw),
            source_ip=ip_anon,
            user_agent=ua[:4000] if ua else None,
            referrer=ref[:2000] if ref else None,
            created_at=now,
            user_id=None,
            event_source="public_page",
            workflow=wf,
            surface="public_page",
            referrer_domain=ref_dom,
            utm_source=extra.get("utm_source"),
            utm_medium=extra.get("utm_medium"),
            utm_campaign=extra.get("utm_campaign"),
            utm_content=extra.get("utm_content"),
            utm_term=extra.get("utm_term"),
            browser=extra.get("browser"),
            os=extra.get("os"),
            device_model=extra.get("device_model"),
            viewport_width=_int_or_none(md_raw.get("viewport_width")),
            viewport_height=_int_or_none(md_raw.get("viewport_height")),
            locale=extra.get("locale"),
            timezone=md_raw.get("timezone") if isinstance(md_raw.get("timezone"), str) else extra.get("timezone"),
            country_code=extra.get("country_code"),
            experiment_arm=md_raw.get("experiment_arm") if isinstance(md_raw.get("experiment_arm"), dict) else {},
            feature_flags=md_raw.get("feature_flags") if isinstance(md_raw.get("feature_flags"), dict) else {},
            client_event_id=ev.client_event_id,
            received_at=now,
        )
        if flush_policy_immediate():
            await enqueue_event_row_sync(row)
        else:
            enqueue_event_row(row)
        accepted += 1

    return TrackBatchOut(ok=True, accepted=accepted)


async def handle_authenticated_track_batch(
    *,
    db: AsyncSession,
    request: Request,
    organization_id: UUID,
    user: User,
    batch: TrackBatchIn,
    redis: Redis | None,
) -> TrackBatchOut:
    """In-app analytics: user_id and org from server; never trust client org."""
    custom_names = await _custom_event_names(db, organization_id)
    ip_anon = anonymize_ipv4_to_slash24(client_ip(request))
    ua = request.headers.get("user-agent")
    ref = request.headers.get("referer") or request.headers.get("referrer")
    ref_dom = referrer_hostname(ref[:2000] if ref else None)
    now = datetime.now(UTC)
    accepted = 0

    for ev in batch.events:
        md_raw = dict(ev.metadata or {})
        pid: UUID | None = None
        if md_raw.get("page_id"):
            try:
                pid = UUID(str(md_raw["page_id"]))
            except (ValueError, TypeError):
                pid = None
            if pid is not None:
                p = await db.get(Page, pid)
                if p is None or p.organization_id != organization_id:
                    raise HTTPException(status_code=400, detail="Invalid page_id for organization")
        if pid is not None:
            md_raw.setdefault("page_id", str(pid))
        ok, err = validate_event_payload(ev.event_type, md_raw, custom_names=custom_names)
        if not ok:
            raise HTTPException(status_code=400, detail=err or "invalid event")
        if await _dedupe_skip(redis, ev.client_event_id):
            continue
        extra = enrich_from_request(request, md_raw)
        row = row_from_parts(
            organization_id=organization_id,
            page_id=pid,
            event_type=ev.event_type,
            visitor_id=ev.visitor_id or f"u:{user.id}",
            session_id=ev.session_id or uuid.uuid4().hex,
            metadata=_trim_metadata_dict(md_raw),
            source_ip=ip_anon,
            user_agent=ua[:4000] if ua else None,
            referrer=ref[:2000] if ref else None,
            created_at=now,
            user_id=user.id,
            event_source="web_app",
            workflow=md_raw.get("workflow") if isinstance(md_raw.get("workflow"), str) else None,
            surface=md_raw.get("surface") if isinstance(md_raw.get("surface"), str) else "studio",
            referrer_domain=ref_dom,
            utm_source=extra.get("utm_source"),
            utm_medium=extra.get("utm_medium"),
            utm_campaign=extra.get("utm_campaign"),
            utm_content=extra.get("utm_content"),
            utm_term=extra.get("utm_term"),
            browser=extra.get("browser"),
            os=extra.get("os"),
            device_model=extra.get("device_model"),
            viewport_width=_int_or_none(md_raw.get("viewport_width")),
            viewport_height=_int_or_none(md_raw.get("viewport_height")),
            locale=extra.get("locale"),
            timezone=md_raw.get("timezone") if isinstance(md_raw.get("timezone"), str) else extra.get("timezone"),
            country_code=extra.get("country_code"),
            experiment_arm=md_raw.get("experiment_arm") if isinstance(md_raw.get("experiment_arm"), dict) else {},
            feature_flags=md_raw.get("feature_flags") if isinstance(md_raw.get("feature_flags"), dict) else {},
            client_event_id=ev.client_event_id,
            received_at=now,
        )
        if flush_policy_immediate():
            await enqueue_event_row_sync(row)
        else:
            enqueue_event_row(row)
        accepted += 1

    return TrackBatchOut(ok=True, accepted=accepted)


def _int_or_none(v: Any) -> int | None:
    try:
        if v is None:
            return None
        return int(v)
    except (TypeError, ValueError):
        return None


def _trim_metadata_dict(md: dict[str, Any]) -> dict[str, Any] | None:
    try:
        raw = json.dumps(md)
    except (TypeError, ValueError):
        return None
    if len(raw) > 16000:
        return {"_truncated": True}
    return md
