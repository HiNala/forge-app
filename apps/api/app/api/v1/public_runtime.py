"""Unauthenticated read of published page HTML (Mission 04)."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Organization, Page, PageVersion
from app.deps.db import get_db_public
from app.schemas.page import PublicPageOut

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
                return PublicPageOut(**data)
        except Exception as e:
            logger.warning("public_page_cache_read %s", e)

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

    html = ""
    if p.published_version_id is not None:
        pv = await db.get(PageVersion, p.published_version_id)
        if pv is not None:
            html = pv.html
    if not html.strip():
        html = p.current_html or ""
    if not html.strip():
        raise HTTPException(status_code=404, detail="Not found")

    return PublicPageOut(
        html=html,
        title=p.title,
        slug=p.slug,
        organization_slug=org.slug,
    )
