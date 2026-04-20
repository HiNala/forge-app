from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AnalyticsEvent, Page, User
from app.deps import get_db, require_tenant
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.public_track import TrackBatchIn
from app.services.analytics.funnels import (
    FunnelDefinition,
    FunnelStep,
    compute_funnel_cached,
)
from app.services.analytics.retention import compute_retention
from app.services.analytics.track_public import handle_authenticated_track_batch
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


@router.post("/analytics/track")
async def analytics_track_ingest(
    body: TrackBatchIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> dict[str, Any]:
    """Authenticated event batch (Studio / Dashboard)."""
    out = await handle_authenticated_track_batch(
        db=db,
        request=request,
        organization_id=ctx.organization_id,
        user=user,
        batch=body,
        redis=getattr(request.app.state, "redis", None),
    )
    return {"ok": out.ok, "accepted": out.accepted}


@router.get("/analytics/realtime")
async def analytics_realtime(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    """Last 5 minutes of activity grouped by page."""
    start = datetime.now(UTC) - timedelta(minutes=5)
    q = text(
        """
        SELECT page_id::text, COUNT(DISTINCT session_id)::int AS sessions,
               COUNT(*)::int AS events
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND created_at >= :start
          AND page_id IS NOT NULL
        GROUP BY page_id
        ORDER BY events DESC
        LIMIT 24
        """
    )
    rows = (await db.execute(q, {"oid": str(ctx.organization_id), "start": start})).all()
    return {
        "window_minutes": 5,
        "pages": [
            {"page_id": r[0], "active_sessions": r[1], "events": r[2]} for r in rows
        ],
    }


@router.get("/analytics/retention")
async def analytics_retention_grid(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    grid = await compute_retention(
        db,
        org_id=ctx.organization_id,
        cohort_event="signup_complete",
        return_event="mixed",
    )
    return grid.model_dump()


@router.get("/analytics/funnels/default/contact-form/compute")
async def analytics_default_funnel_compute(
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
) -> dict[str, Any]:
    now = datetime.now(UTC)
    df = date_from or (now - timedelta(days=7))
    dt = date_to or now
    funnel = FunnelDefinition(
        id="default_contact_form",
        name="Contact form",
        steps=[
            FunnelStep(name="Page view", event_type="page_view"),
            FunnelStep(name="Form view", event_type="form_view"),
            FunnelStep(name="Form start", event_type="form_start"),
            FunnelStep(name="Submit attempt", event_type="form_submit_attempt"),
            FunnelStep(name="Submit success", event_type="form_submit_success"),
        ],
    )
    r = getattr(request.app.state, "redis", None)
    result = await compute_funnel_cached(
        db, r, funnel, organization_id=ctx.organization_id, date_from=df, date_to=dt
    )
    return result.model_dump()


@router.get("/analytics/users/{user_id}/timeline")
async def analytics_user_timeline(
    user_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    sub = (
        await db.execute(
            text("SELECT visitor_id FROM identity_merges WHERE user_id = CAST(:uid AS uuid)"),
            {"uid": str(user_id)},
        )
    ).all()
    vids = [r[0] for r in sub]
    actor_filter = (
        or_(AnalyticsEvent.user_id == user_id, AnalyticsEvent.visitor_id.in_(vids))
        if vids
        else (AnalyticsEvent.user_id == user_id)
    )
    q = (
        select(AnalyticsEvent)
        .where(
            AnalyticsEvent.organization_id == ctx.organization_id,
            actor_filter,
        )
        .order_by(AnalyticsEvent.created_at.desc())
        .limit(min(limit, 200))
    )
    rows = (await db.execute(q)).scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "event_type": r.event_type,
                "created_at": r.created_at.isoformat(),
                "metadata": r.metadata_,
                "page_id": str(r.page_id) if r.page_id else None,
            }
            for r in rows
        ],
        "next_cursor": None,
    }


@router.get("/analytics/visitors/{visitor_id}/timeline")
async def analytics_visitor_timeline(
    visitor_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    q = (
        select(AnalyticsEvent)
        .where(
            AnalyticsEvent.organization_id == ctx.organization_id,
            AnalyticsEvent.visitor_id == visitor_id[:500],
        )
        .order_by(AnalyticsEvent.created_at.desc())
        .limit(min(limit, 200))
    )
    rows = (await db.execute(q)).scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "event_type": r.event_type,
                "created_at": r.created_at.isoformat(),
                "metadata": r.metadata_,
            }
            for r in rows
        ]
    }
