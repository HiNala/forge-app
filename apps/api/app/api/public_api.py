"""Public (unauthenticated) routes used by generated HTML pages."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AnalyticsEvent, Organization, Page, Submission
from app.deps.db import get_db_public
from app.schemas.common import StubResponse
from app.schemas.submission import PublicSubmitOut
from app.services.public_submission import (
    anonymize_ipv4_to_slash24,
    normalize_submit_fields,
    validate_payload_against_form_schema,
    visitor_fingerprint,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/p", tags=["public"])


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def _parse_submit_body(request: Request) -> dict[str, Any]:
    ct = (request.headers.get("content-type") or "").lower()
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
                detail="File uploads are not supported here yet.",
            )
        out[str(k)] = v if isinstance(v, str) else str(v)
    return out


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
    Supports ``application/json`` or ``application/x-www-form-urlencoded``.
    """
    raw = await _parse_submit_body(request)
    email, name, payload = normalize_submit_fields(raw)

    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")

    await db.execute(
        text("SELECT set_config('app.current_tenant_id', :t, true)"),
        {"t": str(org.id)},
    )

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
    ok, reason = validate_payload_against_form_schema(schema, payload)
    if not ok:
        raise HTTPException(status_code=422, detail=reason)

    ip_raw = _client_ip(request)
    ip_anon = anonymize_ipv4_to_slash24(ip_raw)
    ua = request.headers.get("user-agent")

    sub = Submission(
        organization_id=org.id,
        page_id=p.id,
        page_version_id=p.published_version_id,
        payload=payload,
        submitter_email=email,
        submitter_name=name,
        source_ip=ip_anon,
        user_agent=(ua[:4000] if ua else None),
    )
    db.add(sub)
    await db.flush()

    vid = visitor_fingerprint(ip_raw, ua)
    ref = request.headers.get("referer") or request.headers.get("referrer")
    ev = AnalyticsEvent(
        organization_id=org.id,
        page_id=p.id,
        event_type="form_submit",
        visitor_id=vid,
        session_id=uuid.uuid4().hex,
        metadata_={"submission_id": str(sub.id)},
        source_ip=ip_anon,
        user_agent=(ua[:4000] if ua else None),
        referrer=ref[:2000] if ref else None,
    )
    db.add(ev)

    try:
        await db.commit()
    except Exception as e:
        logger.exception("public_submit_commit %s", e)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Could not save submission") from e

    return PublicSubmitOut()


@router.post("/{org_slug}/{page_slug}/upload", response_model=StubResponse)
async def public_upload(org_slug: str, page_slug: str) -> StubResponse:
    del org_slug, page_slug
    return StubResponse()


@router.post("/{org_slug}/{page_slug}/track", response_model=StubResponse)
async def public_track(org_slug: str, page_slug: str) -> StubResponse:
    del org_slug, page_slug
    return StubResponse()
