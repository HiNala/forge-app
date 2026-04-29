"""GL-02 — platform admin session, overview metrics, org listing, LLM rollups."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.platform_auth import (
    load_platform_permissions,
    require_any_platform_access,
    require_platform_permission,
)
from app.db.models import AnalyticsEvent, Membership, OrchestrationRun, Organization, Page, Submission, User
from app.db.models.platform_rbac import PlatformUserRole
from app.deps import get_admin_db

router = APIRouter(prefix="/admin", tags=["admin-platform"])


@router.get("/platform/session")
async def platform_session(
    request: Request,
    user: User = Depends(require_any_platform_access),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    """Permissions and roles for building the admin shell (nav visibility)."""
    perms = await load_platform_permissions(request, user.id)
    roles = (
        await db.execute(select(PlatformUserRole.role_key).where(PlatformUserRole.user_id == user.id))
    ).scalars().all()
    role_keys = (list(roles) if roles else ["legacy_is_admin"]) if user.is_admin else list(roles)
    return {
        "user_id": str(user.id),
        "permissions": sorted(perms),
        "platform_roles": role_keys,
        "legacy_is_admin": bool(user.is_admin),
    }


@router.post("/platform/visit")
async def platform_record_visit(
    user: User = Depends(require_any_platform_access),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, str]:
    """Update last admin visit for Pulse \"since you last visited\"."""
    row = await db.get(User, user.id)
    if row:
        row.platform_last_visit_at = datetime.now(UTC)
        await db.commit()
    return {"status": "ok"}


@router.get("/overview/summary")
async def admin_overview_summary(
    request: Request,
    _u: User = Depends(require_platform_permission("analytics:read_platform_metrics")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    del request
    now = datetime.now(UTC)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    user_total = (
        await db.execute(select(func.count(User.id)).where(User.deleted_at.is_(None)))
    ).scalar_one()
    org_total = (
        await db.execute(select(func.count(Organization.id)).where(Organization.deleted_at.is_(None)))
    ).scalar_one()
    week_ago = now - timedelta(days=7)
    active_users = (
        await db.execute(
            select(func.count(User.id)).where(
                User.deleted_at.is_(None),
                User.updated_at >= week_ago,
            )
        )
    ).scalar_one()
    llm_today = (
        await db.execute(
            select(func.coalesce(func.sum(OrchestrationRun.total_cost_cents), 0)).where(
                OrchestrationRun.created_at >= day_start
            )
        )
    ).scalar_one()
    return {
        "totals": {
            "users": int(user_total),
            "organizations": int(org_total),
            "active_users_7d": int(active_users),
            "llm_cost_cents_today": int(llm_today),
        },
        "generated_at": now.isoformat(),
    }


@router.get("/users")
async def admin_list_users(
    q: str | None = Query(None, description="Search by email or display_name"),
    limit: int = Query(50, ge=1, le=100),
    _u: User = Depends(require_platform_permission("orgs:read_list")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    stmt = select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.desc()).limit(limit)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                User.email.ilike(like),
                User.display_name.ilike(like),
            )
        )
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "items": [
            {
                "id": str(u.id),
                "email": str(u.email),
                "display_name": u.display_name,
                "is_admin": bool(u.is_admin),
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in rows
        ],
        "next_cursor": None,
    }


@router.get("/organizations")
async def admin_list_organizations(
    request: Request,
    q: str | None = Query(None, description="Search name, slug, stripe id"),
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = None,
    _u: User = Depends(require_platform_permission("orgs:read_list")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    del request, cursor
    stmt = (
        select(Organization)
        .where(Organization.deleted_at.is_(None))
        .order_by(Organization.created_at.desc())
        .limit(limit)
    )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Organization.name.ilike(like),
                Organization.slug.ilike(like),
                Organization.stripe_customer_id.ilike(like),
            )
        )
    rows = (await db.execute(stmt)).scalars().all()
    out = []
    for org in rows:
        mc = (
            await db.execute(
                select(func.count(Membership.id)).where(Membership.organization_id == org.id)
            )
        ).scalar_one()
        out.append(
            {
                "id": str(org.id),
                "name": org.name,
                "slug": org.slug,
                "plan": org.plan,
                "account_status": org.account_status,
                "stripe_customer_id": org.stripe_customer_id,
                "member_count": int(mc),
                "created_at": org.created_at.isoformat() if org.created_at else None,
            }
        )
    return {"items": out, "next_cursor": None}


@router.get("/organizations/{org_id}")
async def admin_get_organization(
    org_id: UUID,
    _u: User = Depends(require_platform_permission("orgs:read_detail")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    org = await db.get(Organization, org_id)
    if org is None or org.deleted_at is not None:
        from app.core.errors import NotFound

        raise NotFound("Organization not found")
    mc = (
        await db.execute(select(func.count(Membership.id)).where(Membership.organization_id == org.id))
    ).scalar_one()
    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "plan": org.plan,
        "account_status": org.account_status,
        "stripe_customer_id": org.stripe_customer_id,
        "stripe_subscription_id": org.stripe_subscription_id,
        "member_count": int(mc),
        "created_at": org.created_at.isoformat() if org.created_at else None,
        "org_settings": org.org_settings or {},
    }


@router.get("/llm/summary")
async def admin_llm_summary(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    _u: User = Depends(require_platform_permission("llm:read_usage")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    del request
    since = datetime.now(UTC) - timedelta(days=days)
    total_cost = (
        await db.execute(
            select(func.coalesce(func.sum(OrchestrationRun.total_cost_cents), 0)).where(
                OrchestrationRun.created_at >= since
            )
        )
    ).scalar_one()
    total_runs = (
        await db.execute(
            select(func.count(OrchestrationRun.id)).where(OrchestrationRun.created_at >= since)
        )
    ).scalar_one()
    by_status = (
        await db.execute(
            select(OrchestrationRun.status, func.count(OrchestrationRun.id))
            .where(OrchestrationRun.created_at >= since)
            .group_by(OrchestrationRun.status)
        )
    ).all()
    return {
        "window_days": days,
        "total_cost_cents": int(total_cost),
        "run_count": int(total_runs),
        "runs_by_status": {row[0]: int(row[1]) for row in by_status},
    }


@router.get("/orchestration-runs")
async def admin_orchestration_runs_list(
    min_quality: float | None = Query(None, ge=0, le=100),
    max_quality: float | None = Query(None, ge=0, le=100),
    limit: int = Query(80, ge=1, le=400),
    _u: User = Depends(require_platform_permission("llm:read_run_traces")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    """Recent runs — optional coarse filter when ``quality_score`` is populated on rows."""
    stmt = select(OrchestrationRun).order_by(OrchestrationRun.created_at.desc()).limit(limit)
    if min_quality is not None:
        stmt = stmt.where(
            OrchestrationRun.quality_score.isnot(None), OrchestrationRun.quality_score >= min_quality
        )
    if max_quality is not None:
        stmt = stmt.where(
            OrchestrationRun.quality_score.isnot(None), OrchestrationRun.quality_score <= max_quality
        )
    rows = (await db.execute(stmt)).scalars().all()
    return {
        "items": [
            {
                "id": str(r.id),
                "organization_id": str(r.organization_id),
                "status": r.status,
                "graph_name": r.graph_name,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "quality_score": float(r.quality_score) if r.quality_score is not None else None,
                "total_duration_ms": r.total_duration_ms,
                "prompt_excerpt": (r.prompt[:120] + "…") if r.prompt and len(r.prompt) > 120 else r.prompt,
            }
            for r in rows
        ]
    }


@router.get("/orchestration-runs/{run_id}")
async def admin_orchestration_run_detail(
    run_id: UUID,
    _u: User = Depends(require_platform_permission("llm:read_run_traces")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    row = await db.get(OrchestrationRun, run_id)
    if row is None:
        from app.core.errors import NotFound

        raise NotFound("Run not found")
    return {
        "id": str(row.id),
        "organization_id": str(row.organization_id),
        "page_id": str(row.page_id) if row.page_id else None,
        "user_id": str(row.user_id) if row.user_id else None,
        "graph_name": row.graph_name,
        "status": row.status,
        "intent": row.intent,
        "plan": row.plan,
        "review_findings": row.review_findings,
        "node_timings": row.node_timings,
        "agent_calls": row.agent_calls,
        "four_layer_output": row.four_layer_output,
        "quality_score": float(row.quality_score) if row.quality_score is not None else None,
        "dimension_scores": row.dimension_scores,
        "total_tokens_input": row.total_tokens_input,
        "total_tokens_output": row.total_tokens_output,
        "total_cost_cents": row.total_cost_cents,
        "total_duration_ms": row.total_duration_ms,
        "error_message": row.error_message,
        "prompt": row.prompt,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/analytics/platform")
async def admin_platform_analytics(
    days: int = Query(30, ge=1, le=365),
    _u: User = Depends(require_platform_permission("analytics:read_platform_metrics")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    """Platform-wide analytics rollup for admin dashboard."""
    since = datetime.now(UTC) - timedelta(days=days)

    total_users = (
        await db.execute(select(func.count(User.id)).where(User.deleted_at.is_(None)))
    ).scalar_one()
    new_users = (
        await db.execute(select(func.count(User.id)).where(User.created_at >= since, User.deleted_at.is_(None)))
    ).scalar_one()
    total_orgs = (
        await db.execute(select(func.count(Organization.id)).where(Organization.deleted_at.is_(None)))
    ).scalar_one()
    total_pages = (
        await db.execute(select(func.count(Page.id)))
    ).scalar_one()
    live_pages = (
        await db.execute(select(func.count(Page.id)).where(Page.status == "live"))
    ).scalar_one()
    total_submissions = (
        await db.execute(select(func.count(Submission.id)).where(Submission.created_at >= since))
    ).scalar_one()
    total_page_views = (
        await db.execute(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.event_type == "page_view",
                AnalyticsEvent.created_at >= since,
            )
        )
    ).scalar_one()
    total_llm_cost = (
        await db.execute(
            select(func.coalesce(func.sum(OrchestrationRun.total_cost_cents), 0)).where(
                OrchestrationRun.created_at >= since
            )
        )
    ).scalar_one()
    total_llm_runs = (
        await db.execute(
            select(func.count(OrchestrationRun.id)).where(OrchestrationRun.created_at >= since)
        )
    ).scalar_one()

    plans = (
        await db.execute(
            select(Organization.plan, func.count(Organization.id))
            .where(Organization.deleted_at.is_(None))
            .group_by(Organization.plan)
        )
    ).all()

    return {
        "window_days": days,
        "users": {"total": int(total_users), "new_in_window": int(new_users)},
        "organizations": {
            "total": int(total_orgs),
            "by_plan": {plan: int(cnt) for plan, cnt in plans},
        },
        "pages": {"total": int(total_pages), "live": int(live_pages)},
        "submissions_in_window": int(total_submissions),
        "page_views_in_window": int(total_page_views),
        "llm": {
            "cost_cents_in_window": int(total_llm_cost),
            "runs_in_window": int(total_llm_runs),
        },
        "generated_at": datetime.now(UTC).isoformat(),
    }
