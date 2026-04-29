"""Nightly BP-02 learning loop — aggregates feedback and writes improvement reports."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ArtifactFeedback, DesignMemory
from app.db.models.improvement_report import ImprovementReport

logger = logging.getLogger(__name__)


async def run_improvement_loop(db: AsyncSession, *, horizon_hours: int = 24) -> dict[str, Any]:
    """Aggregates signals, optionally prunes stale memory, persists a platform report row."""
    end = datetime.now(UTC)
    start = end - timedelta(hours=horizon_hours)

    n_fb = (
        await db.execute(
            select(func.count()).select_from(ArtifactFeedback).where(ArtifactFeedback.created_at >= start)
        )
    ).scalar_one()

    stale = (
        await db.execute(
            select(func.count()).select_from(DesignMemory).where(
                DesignMemory.strength < 0.15,
                DesignMemory.updated_at < end - timedelta(days=30),
            )
        )
    ).scalar_one()

    summary = (
        f"Window {start.isoformat()} → {end.isoformat()}: "
        f"{int(n_fb)} feedback events; {int(stale)} stale memory rows eligible for review."
    )
    patterns: list[dict[str, Any]] = [
        {"kind": "feedback_volume", "count": int(n_fb)},
        {"kind": "stale_memory_candidates", "count": int(stale)},
    ]
    row = ImprovementReport(
        organization_id=None,
        window_start=start,
        window_end=end,
        summary=summary,
        metrics={"feedback_count": int(n_fb), "stale_memory_count": int(stale)},
        patterns=patterns,
    )
    db.add(row)
    await db.commit()
    return {"report_id": str(row.id), "summary": summary}


async def prune_weak_memories(
    db: AsyncSession, *, min_strength: float = 0.15, older_than_days: int = 30
) -> int:
    """Delete very weak memory that has not been reinforced (best-effort)."""
    from sqlalchemy import and_, delete

    cutoff = datetime.now(UTC) - timedelta(days=older_than_days)
    res = await db.execute(
        delete(DesignMemory).where(
            and_(DesignMemory.strength < min_strength, DesignMemory.updated_at < cutoff)
        )
    )
    await db.commit()
    rc = getattr(res, "rowcount", None)
    return int(rc or 0)
