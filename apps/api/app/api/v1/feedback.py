"""Per-artifact feedback (BP-02)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ArtifactFeedback, OrchestrationRun, User
from app.deps import get_db, require_role
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.bp_feedback import FeedbackSubmitIn, FeedbackSubmitOut
from app.services.memory.feedback_to_memory import apply_feedback_to_memory
from app.services.user_prefs_merge import merged_user_preferences

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackSubmitOut)
async def submit_artifact_feedback(
    body: FeedbackSubmitIn,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
    user: User = Depends(require_user),
) -> FeedbackSubmitOut:
    run = await db.get(OrchestrationRun, body.run_id)
    if run is None or run.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="run_not_found")

    prefs = merged_user_preferences(user.user_preferences)
    apply_memory = getattr(prefs, "forge_apply_memory", True)

    stmt = select(ArtifactFeedback).where(
        ArtifactFeedback.organization_id == ctx.organization_id,
        ArtifactFeedback.user_id == user.id,
        ArtifactFeedback.run_id == body.run_id,
        ArtifactFeedback.artifact_kind == body.artifact_kind,
        ArtifactFeedback.artifact_ref == body.artifact_ref,
    )
    fb = (await db.execute(stmt)).scalar_one_or_none()
    if fb:
        fb.sentiment = body.sentiment
        fb.structured_reasons = list(body.structured_reasons)
        fb.free_text = body.free_text
        fb.action_taken = body.action_taken
        fb.preceded_refine_run_id = body.preceded_refine_run_id
        db.add(fb)
    else:
        fb = ArtifactFeedback(
            organization_id=ctx.organization_id,
            user_id=user.id,
            run_id=body.run_id,
            artifact_kind=body.artifact_kind,
            artifact_ref=body.artifact_ref,
            sentiment=body.sentiment,
            structured_reasons=list(body.structured_reasons),
            free_text=body.free_text,
            action_taken=body.action_taken,
            preceded_refine_run_id=body.preceded_refine_run_id,
        )
        db.add(fb)
    await db.flush()

    writes: list[dict[str, Any]] = []
    if apply_memory:
        writes = await apply_feedback_to_memory(db, fb)

    await db.commit()
    await db.refresh(fb)
    return FeedbackSubmitOut(id=fb.id, memory_writes=writes)
