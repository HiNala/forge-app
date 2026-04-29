"""Correlate critic scores with user feedback (BP-02 daily stub)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ArtifactFeedback, OrchestrationRun

logger = logging.getLogger(__name__)


async def daily_critic_calibration_snapshot(
    db: AsyncSession, *, days: int = 7
) -> dict[str, Any]:
    """Returns a coarse correlation hint: avg feedback sentiment vs review quality bucket."""
    since = datetime.now(UTC) - timedelta(days=days)
    runs = (
        await db.execute(
            select(OrchestrationRun)
            .where(OrchestrationRun.created_at >= since)
            .where(OrchestrationRun.review_findings.isnot(None))
            .limit(500)
        )
    ).scalars().all()
    qs: list[float] = []
    for r in runs:
        rf = r.review_findings or {}
        q = rf.get("quality_score")
        if isinstance(q, (int, float)):
            qs.append(float(q))

    thumbs = (
        await db.execute(
            select(func.count()).select_from(ArtifactFeedback).where(
                ArtifactFeedback.created_at >= since, ArtifactFeedback.sentiment == "positive"
            )
        )
    ).scalar_one()
    nay = (
        await db.execute(
            select(func.count()).select_from(ArtifactFeedback).where(
                ArtifactFeedback.created_at >= since, ArtifactFeedback.sentiment == "negative"
            )
        )
    ).scalar_one()

    avg_q = sum(qs) / len(qs) if qs else None
    return {
        "window_days": days,
        "avg_review_quality": avg_q,
        "thumbs_up": int(thumbs),
        "thumbs_down_proxy": int(nay),
        "hint": (
            "If thumbs_down grows while avg_review_quality stays high, widen critic dimensions "
            "or tighten voice/layout checks."
        ),
    }
