"""Persist orchestration traces."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import OrchestrationRun


async def upsert_clarify_pending(
    db: AsyncSession,
    *,
    run_id: UUID,
    organization_id: UUID,
    user_id: UUID | None,
    intent: dict[str, Any],
    graph_state: dict[str, Any],
) -> datetime:
    """Save a graph snapshot + clarify expiry so ``/generate/continue`` can validate ``run_id`` (AL-03)."""
    ttl = int(getattr(settings, "CLARIFY_SESSION_TTL_SECONDS", 1800))
    exp = datetime.now(UTC) + timedelta(seconds=ttl)

    row = await db.get(OrchestrationRun, run_id)
    if row is None:
        row = OrchestrationRun(
            id=run_id,
            organization_id=organization_id,
            user_id=user_id,
            page_id=None,
            graph_name="generate",
            prompt=None,
            intent=intent,
            plan=None,
            review_findings=None,
            graph_state=graph_state,
            clarify_expires_at=exp,
            node_timings={},
            status="running",
            total_duration_ms=0,
        )
        db.add(row)
    else:
        row.intent = intent
        row.graph_state = graph_state
        row.clarify_expires_at = exp
        row.status = "running"
    await db.flush()
    return exp


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
    review_findings: dict[str, Any] | None = None,
    agent_calls: list[Any] | None = None,
    four_layer_output: dict[str, Any] | None = None,
) -> None:
    row = await db.get(OrchestrationRun, run_id)
    if row is None:
        db.add(
            OrchestrationRun(
                id=run_id,
                organization_id=organization_id,
                page_id=page_id,
                user_id=user_id,
                graph_name=graph_name,
                prompt=prompt[:8000],
                intent=intent,
                plan=plan,
                review_findings=review_findings,
                agent_calls=agent_calls,
                four_layer_output=four_layer_output,
                node_timings=node_timings,
                total_duration_ms=total_duration_ms,
                status=status,
                error_message=error_message,
            )
        )
        return

    row.organization_id = organization_id
    row.page_id = page_id
    row.user_id = user_id
    row.graph_name = graph_name
    row.prompt = prompt[:8000]
    row.intent = intent
    row.plan = plan
    row.review_findings = review_findings
    row.agent_calls = agent_calls
    row.four_layer_output = four_layer_output
    row.node_timings = node_timings
    row.total_duration_ms = total_duration_ms
    row.status = status
    row.error_message = error_message
    row.clarify_expires_at = None
