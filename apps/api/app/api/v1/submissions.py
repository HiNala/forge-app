from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete as sql_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AutomationRun,
    BrandKit,
    Page,
    Submission,
    SubmissionFile,
    SubmissionReply,
    User,
)
from app.deps import get_db, require_role, require_tenant
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.automation import SubmissionReplyBody
from app.schemas.common import StubResponse
from app.schemas.submission import DraftReplyOut, SubmissionOut, SubmissionPatchBody
from app.services.email import email_service

router = APIRouter(prefix="/submissions", tags=["submissions"])

_VALID_STATUS = frozenset({"new", "read", "replied", "archived"})


@router.get("/{submission_id}", response_model=SubmissionOut)
async def get_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> Submission:
    sub = (
        await db.execute(select(Submission).where(Submission.id == submission_id))
    ).scalar_one_or_none()
    if sub is None or sub.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="not found")
    return sub


@router.delete("/{submission_id}", status_code=204)
async def delete_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Response:
    sub = (
        await db.execute(select(Submission).where(Submission.id == submission_id))
    ).scalar_one_or_none()
    if sub is None or sub.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="not found")
    await db.execute(
        sql_delete(SubmissionReply).where(SubmissionReply.submission_id == submission_id)
    )
    await db.execute(
        sql_delete(SubmissionFile).where(SubmissionFile.submission_id == submission_id)
    )
    await db.execute(sql_delete(AutomationRun).where(AutomationRun.submission_id == submission_id))
    await db.delete(sub)
    await db.commit()
    return Response(status_code=204)


@router.patch("/{submission_id}", response_model=SubmissionOut)
async def patch_submission(
    submission_id: UUID,
    body: SubmissionPatchBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Submission:
    sub = (
        await db.execute(select(Submission).where(Submission.id == submission_id))
    ).scalar_one_or_none()
    if sub is None or sub.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="not found")
    if body.status is None:
        raise HTTPException(status_code=400, detail="no fields to update")
    if body.status not in _VALID_STATUS:
        raise HTTPException(status_code=400, detail="invalid status")
    sub.status = body.status
    await db.commit()
    await db.refresh(sub)
    return sub


@router.post("/{submission_id}/draft-reply", response_model=DraftReplyOut)
async def draft_reply_suggestion(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> DraftReplyOut:
    """Fast template reply (Mission FE-05). Replace with LLM when wired."""
    sub = (
        await db.execute(select(Submission).where(Submission.id == submission_id))
    ).scalar_one_or_none()
    if sub is None or sub.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="not found")
    name = sub.submitter_name or "there"
    body_text = (
        f"Hi {name},\n\n"
        "Thank you for your submission — we've received it and will get back to you shortly.\n\n"
        "If anything needs to change, just reply to this email.\n\n"
        "Best regards"
    )
    return DraftReplyOut(subject="Re: your submission", body=body_text)


@router.post("/{submission_id}/reply")
async def reply_submission(
    submission_id: UUID,
    body: SubmissionReplyBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> dict[str, str | bool]:
    sub = (
        await db.execute(select(Submission).where(Submission.id == submission_id))
    ).scalar_one_or_none()
    if sub is None or sub.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    if await db.get(Page, sub.page_id) is None:
        raise HTTPException(status_code=404, detail="Page not found")

    bk = (
        await db.execute(
            select(BrandKit).where(BrandKit.organization_id == ctx.organization_id)
        )
    ).scalar_one_or_none()
    if sub.submitter_email is None:
        raise HTTPException(status_code=400, detail="Submitter email unknown")

    mid = await email_service.send_reply(
        to_email=sub.submitter_email,
        subject_line=body.subject,
        body_text=body.body,
        primary_color=bk.primary_color if bk else None,
        logo_url=bk.logo_url if bk else None,
        in_reply_to=sub.notification_message_id,
    )
    rep = SubmissionReply(
        submission_id=sub.id,
        organization_id=ctx.organization_id,
        subject=body.subject,
        body=body.body,
        sent_by_user_id=user.id,
        resend_message_id=mid,
    )
    db.add(rep)
    sub.status = "replied"
    await db.commit()
    return {"ok": True, "resend_message_id": mid or ""}


@router.get("/{submission_id}/files/{file_id}", response_model=StubResponse)
async def presign_submission_file(
    submission_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()
