from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Page
from app.deps import get_db, require_tenant
from app.deps.tenant import TenantContext
from app.services.analytics_cache import (
    cache_get_json,
    cache_set_json,
    summary_cache_key_org,
    summary_cache_key_page,
)
from app.services.analytics_service import (
    is_form_page_type,
    is_proposal_page_type,
    org_summary,
    page_engagement,
    page_events_page,
    page_funnel,
    page_summary,
)

router = APIRouter(tags=["analytics"])

_RANGE = ("7d", "30d", "90d")


@router.get("/pages/{page_id}/analytics/summary")
async def page_analytics_summary(
    page_id: UUID,
    request: Request,
    range: str = Query("7d", description="7d | 30d | 90d"),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    if range not in _RANGE:
        raise HTTPException(status_code=400, detail="Invalid range")
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")

    r = getattr(request.app.state, "redis", None)
    ck = summary_cache_key_page(page_id, range)
    if r is not None:
        hit = await cache_get_json(r, ck)
        if hit is not None:
            return hit

    data = await page_summary(
        db,
        organization_id=ctx.organization_id,
        page_id=page_id,
        range_key=range,
    )
    data["page_type"] = p.page_type
    if r is not None:
        await cache_set_json(r, ck, data)
    return data


@router.get("/pages/{page_id}/analytics/funnel")
async def page_analytics_funnel(
    page_id: UUID,
    range: str = Query("7d"),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    if range not in _RANGE:
        raise HTTPException(status_code=400, detail="Invalid range")
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    if not is_form_page_type(p.page_type):
        raise HTTPException(status_code=404, detail="Funnel is only available for form pages")
    return await page_funnel(
        db,
        organization_id=ctx.organization_id,
        page_id=page_id,
        range_key=range,
    )


@router.get("/pages/{page_id}/analytics/engagement")
async def page_analytics_engagement(
    page_id: UUID,
    range: str = Query("7d"),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    if range not in _RANGE:
        raise HTTPException(status_code=400, detail="Invalid range")
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    if not is_proposal_page_type(p.page_type):
        raise HTTPException(
            status_code=404,
            detail="Engagement is only available for proposal pages",
        )
    return await page_engagement(
        db,
        organization_id=ctx.organization_id,
        page_id=page_id,
        range_key=range,
    )


@router.get("/pages/{page_id}/analytics/events")
async def page_analytics_events(
    page_id: UUID,
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    return await page_events_page(
        db,
        organization_id=ctx.organization_id,
        page_id=page_id,
        cursor=cursor,
    )


@router.get("/analytics/summary")
async def org_analytics_summary(
    request: Request,
    range: str = Query("7d"),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    if range not in _RANGE:
        raise HTTPException(status_code=400, detail="Invalid range")
    r = getattr(request.app.state, "redis", None)
    ck = summary_cache_key_org(ctx.organization_id, range)
    if r is not None:
        hit = await cache_get_json(r, ck)
        if hit is not None:
            return hit
    data = await org_summary(db, organization_id=ctx.organization_id, range_key=range)
    if r is not None:
        await cache_set_json(r, ck, data)
    return data
