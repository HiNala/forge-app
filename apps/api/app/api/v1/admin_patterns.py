"""Founder-visible pattern rollup (BP-02)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.platform_auth import require_platform_permission
from app.db.models import ArtifactFeedback, DesignMemory, User
from app.deps import get_admin_db

router = APIRouter(prefix="/admin/patterns", tags=["admin-patterns"])


def _contributes_to_platform(u: User | None) -> bool:
    if u is None or not isinstance(u.user_preferences, dict):
        return True
    v = u.user_preferences.get("forge_contribute_feedback_to_platform")
    if v is False:
        return False
    return not (isinstance(v, str) and v.lower() in ("false", "0"))


@router.get("/feed")
async def patterns_feed(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(120, ge=1, le=400),
    respect_opt_out: bool = Query(True),
    _u: User = Depends(require_platform_permission("analytics:read_platform_metrics")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    """Rolling feedback list (privacy: optional filter when users opt out of platform analytics)."""
    since = datetime.now(UTC) - timedelta(days=days)
    stmt = (
        select(ArtifactFeedback)
        .where(ArtifactFeedback.created_at >= since)
        .order_by(ArtifactFeedback.created_at.desc())
        .limit(limit * 4)
    )
    rows = (await db.execute(stmt)).scalars().all()
    items: list[dict[str, Any]] = []
    for r in rows:
        u = await db.get(User, r.user_id)
        if respect_opt_out and not _contributes_to_platform(u):
            continue
        items.append(
            {
                "id": str(r.id),
                "artifact_kind": r.artifact_kind,
                "artifact_ref": r.artifact_ref,
                "sentiment": r.sentiment,
                "structured_reasons": r.structured_reasons,
                "free_text": r.free_text,
                "action_taken": r.action_taken,
                "run_id": str(r.run_id),
                "created_at": r.created_at.isoformat(),
            }
        )
        if len(items) >= limit:
            break
    return {"items": items, "generated_at": datetime.now(UTC).isoformat()}


@router.get("/recurring")
async def patterns_recurring(
    days: int = Query(30, ge=1, le=120),
    limit: int = Query(60, ge=1, le=400),
    _u: User = Depends(require_platform_permission("analytics:read_platform_metrics")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    """Groups (artifact_kind, top reason fingerprint) → counts."""
    since = datetime.now(UTC) - timedelta(days=days)
    rows = (
        await db.execute(
            select(ArtifactFeedback).where(ArtifactFeedback.created_at >= since).limit(5000)
        )
    ).scalars().all()
    buckets: dict[str, dict[str, Any]] = {}
    for r in rows:
        u = await db.get(User, r.user_id)
        if not _contributes_to_platform(u):
            continue
        reasons = tuple(sorted(str(x) for x in (r.structured_reasons or [])))
        key = f"{r.artifact_kind}|{reasons}|{r.action_taken or ''}"
        b = buckets.setdefault(
            key,
            {
                "artifact_kind": r.artifact_kind,
                "reasons": list(reasons),
                "action_taken": r.action_taken,
                "count": 0,
            },
        )
        b["count"] += 1
    ranked = sorted(buckets.values(), key=lambda x: x["count"], reverse=True)[:limit]
    return {"groups": ranked, "window_days": days}


@router.get("/stale-memory")
async def patterns_stale_memory(
    _u: User = Depends(require_platform_permission("analytics:read_platform_metrics")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    cutoff = datetime.now(UTC) - timedelta(days=30)
    n = (
        await db.execute(
            select(func.count())
            .select_from(DesignMemory)
            .where(DesignMemory.strength < 0.2, DesignMemory.updated_at < cutoff)
        )
    ).scalar_one()
    return {"stale_memory_candidates": int(n)}


@router.post("/learning-loop/run-once")
async def patterns_run_learning_once(
    _u: User = Depends(require_platform_permission("analytics:read_platform_metrics")),
    db: AsyncSession = Depends(get_admin_db),
) -> dict[str, Any]:
    """Operator trigger for the nightly aggregator (runs synchronously when called)."""
    from app.services.workers.learning_loop import run_improvement_loop

    return await run_improvement_loop(db, horizon_hours=24)
