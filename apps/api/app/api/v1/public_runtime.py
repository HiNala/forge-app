"""Unauthenticated read of published page HTML (Mission 04)."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, Page, PageVersion
from app.db.rls_context import set_active_organization
from app.deps.db import get_db_public
from app.schemas.page import PublicPageOut
from app.services.booking_slot_inject import inject_booking_slot_runtime
from app.services.deck_public_inject import inject_deck_public_runtime
from app.services.forge_tracker import inject_forge_tracker
from app.services.proposal_public_inject import inject_proposal_public_runtime
from app.services.public_brand_badge import (
    forge_branding_visible_for_plan,
    inject_made_with_forge_badge,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public/pages", tags=["public-pages"])

_CACHE_PREFIX = "page:live:"


@router.get("/{org_slug}/{page_slug}", response_model=PublicPageOut)
async def get_public_page(
    org_slug: str,
    page_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> PublicPageOut:
    """Return published snapshot HTML for a live page (used by Next `(public)/p/...`)."""
    key = f"{_CACHE_PREFIX}{org_slug}:{page_slug}"
    r: Any = getattr(request.app.state, "redis", None)
    if r is not None:
        try:
            raw = await r.get(key)
            if raw:
                data = json.loads(raw)
                data["html"] = inject_forge_tracker(
                    data["html"],
                    api_base=settings.API_BASE_URL,
                    org_slug=data["organization_slug"],
                    page_slug=data["slug"],
                    page_id=data.get("page_id", ""),
                    page_type=data.get("page_type", "landing"),
                )
                if data.get("page_type") == "proposal":
                    data["html"] = inject_proposal_public_runtime(
                        data["html"],
                        api_base=settings.API_BASE_URL,
                        org_slug=data["organization_slug"],
                        page_slug=data["slug"],
                    )
                if data.get("page_type") == "pitch_deck":
                    data["html"] = inject_deck_public_runtime(
                        data["html"],
                        api_base=settings.API_BASE_URL,
                        org_slug=data["organization_slug"],
                        page_slug=data["slug"],
                        page_id=str(data.get("page_id", "")),
                    )
                data["html"] = inject_booking_slot_runtime(data["html"])
                raw_plan = data.get("org_plan")
                plan_str = str(raw_plan) if raw_plan is not None else None
                show_badge = forge_branding_visible_for_plan(plan_str)
                if show_badge:
                    data["html"] = inject_made_with_forge_badge(
                        data["html"],
                        show=True,
                        page_id=str(data.get("page_id", "")),
                        forge_site_base=settings.APP_PUBLIC_URL,
                    )
                return PublicPageOut(
                    html=data["html"],
                    title=data["title"],
                    slug=data["slug"],
                    organization_slug=data["organization_slug"],
                    page_id=str(data.get("page_id", "")),
                    page_type=str(data.get("page_type", "landing")),
                    show_forge_branding=show_badge,
                )
        except Exception as e:
            logger.warning("public_page_cache_read %s", e)

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

    html = ""
    if p.published_version_id is not None:
        pv = await db.get(PageVersion, p.published_version_id)
        if pv is not None:
            html = pv.html
    if not html.strip():
        html = p.current_html or ""
    if not html.strip():
        raise HTTPException(status_code=404, detail="Not found")

    html_out = inject_forge_tracker(
        html,
        api_base=settings.API_BASE_URL,
        org_slug=org.slug,
        page_slug=p.slug,
        page_id=str(p.id),
        page_type=p.page_type,
    )
    if p.page_type == "proposal":
        html_out = inject_proposal_public_runtime(
            html_out,
            api_base=settings.API_BASE_URL,
            org_slug=org.slug,
            page_slug=p.slug,
        )
    if p.page_type == "pitch_deck":
        html_out = inject_deck_public_runtime(
            html_out,
            api_base=settings.API_BASE_URL,
            org_slug=org.slug,
            page_slug=p.slug,
            page_id=str(p.id),
        )
    html_out = inject_booking_slot_runtime(html_out)
    show_badge = forge_branding_visible_for_plan(str(org.plan) if org.plan is not None else None)
    if show_badge:
        html_out = inject_made_with_forge_badge(
            html_out,
            show=True,
            page_id=str(p.id),
            forge_site_base=settings.APP_PUBLIC_URL,
        )
    return PublicPageOut(
        html=html_out,
        title=p.title,
        slug=p.slug,
        organization_slug=org.slug,
        page_id=str(p.id),
        page_type=p.page_type,
        show_forge_branding=show_badge,
    )
