"""Persist orchestration traces."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import OrchestrationRun


async def record_run(
    db: AsyncSession,
    *,
    run_id: UUID,
    organization_id: UUID,
    user_id: UUID | None,
    page_id: UUID | None,
    graph_name: str,
    prompt: str,
    intent: dict[str, Any],
    plan: dict[str, Any] | None,
    node_timings: dict[str, int],
    status: str,
    total_duration_ms: int,
    error_message: str | None = None,
) -> None:
    row = OrchestrationRun(
        id=run_id,
        organization_id=organization_id,
        page_id=page_id,
        user_id=user_id,
        graph_name=graph_name,
        prompt=prompt[:8000],
        intent=intent,
        plan=plan,
        review_findings=None,
        node_timings=node_timings,
        total_duration_ms=total_duration_ms,
        status=status,
        error_message=error_message,
    )
    db.add(row)
