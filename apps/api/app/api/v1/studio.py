from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.config import settings
from app.db.models import Conversation, Message, OrchestrationRun, Organization, Page, PageRevision, User
from app.db.models.studio_attachment import StudioAttachment
from app.deps import get_db, require_role, require_tenant, require_user
from app.deps.tenant import TenantContext
from app.schemas.studio import (
    StudioConversationResponse,
    StudioEstimateOut,
    StudioGenerateContinueRequest,
    StudioGenerateRequest,
    StudioMessageCreateRequest,
    StudioMessageOut,
    StudioPresignOut,
    StudioPresignRequest,
    StudioRefineRequest,
    StudioRegisterAttachmentIn,
    StudioRegisterAttachmentOut,
    StudioSectionEditRequest,
    StudioSectionEditResponse,
)
from app.services.ai.usage import (
    assert_page_generation_allowed,
    increment_section_edits,
    usage_snapshot,
)
from app.services.billing.concurrency import (
    acquire_studio_slot,
    capacity_for_org_plan,
    concurrency_detail_payload,
    release_studio_slot,
)
from app.services.billing.credits import (
    OVERAGE_RATES_CENTS_PER_CREDIT,
    apply_charge,
    check_balance,
    compute_charge,
    compute_studio_pipeline_credits,
    credit_tier_for_plan,
    forge_credits_402_payload,
)
from app.services.orchestration.models import PageIntent
from app.services.orchestration.pipeline import (
    prepare_studio_page_generation,
    stream_studio_page_generation_tail,
)
from app.services.orchestration.product_brain.orchestrator import stream_product_page_generation
from app.services.orchestration.section_editor import (
    edit_section_html,
    extract_section_html,
    splice_section,
)
from app.services.rate_limit_studio import rate_limit_studio_generate
from app.services.storage_s3 import presign_put_studio_attachment
from app.services.vision.extract import stub_extract_from_kind

router = APIRouter(prefix="/studio", tags=["studio"])


@router.get("/usage")
async def studio_usage(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    """Monthly quota + token usage for the active org (Studio UI)."""
    return await usage_snapshot(db, ctx.organization_id)


@router.post("/estimate", response_model=StudioEstimateOut)
async def studio_estimate(
    body: StudioGenerateRequest,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> StudioEstimateOut:
    """Informative generation credit preview before running ``/studio/generate`` (AL-02)."""
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    refining = body.page_id is not None
    wf = str(body.forced_workflow or "landing").lower()
    pit = PageIntent(workflow="landing", page_type="landing", title_suggestion=body.prompt[:120] or "Untitled")
    if wf in {"pitch_deck", "pitch", "deck"} or "deck" in wf:
        pit.workflow = "pitch_deck"
        pit.page_type = "pitch_deck"
    credits = compute_studio_pipeline_credits(pit, refining_existing_page=refining)
    tier = credit_tier_for_plan(org.plan, trial_ends_at=org.trial_ends_at)
    rate = OVERAGE_RATES_CENTS_PER_CREDIT.get(tier, 10)
    cents_hint = int(credits * rate)
    seconds = max(25, min(900, credits * 4))
    cf: Literal["low", "medium", "high"] = "medium" if body.forced_workflow else "low"
    return StudioEstimateOut(
        estimated_credits=credits,
        estimated_cost_cents_hint=cents_hint,
        estimated_seconds=int(seconds),
        confidence=cf,
    )


@router.post("/attachments/presign", response_model=StudioPresignOut)
async def studio_presign_attachment(
    body: StudioPresignRequest,
    ctx: TenantContext = Depends(require_tenant),
) -> StudioPresignOut:
    if not body.content_type.startswith(("image/", "application/pdf")):
        raise HTTPException(status_code=400, detail="Only images and PDFs are allowed")
    out = presign_put_studio_attachment(
        organization_id=ctx.organization_id,
        session_id=body.session_id or "default",
        filename=body.filename,
        content_type=body.content_type,
    )
    return StudioPresignOut(
        url=out["url"],
        storage_key=out["storage_key"],
        max_size_bytes=int(out["max_size_bytes"]),
    )


@router.post("/attachments/register", response_model=StudioRegisterAttachmentOut)
async def studio_register_attachment(
    body: StudioRegisterAttachmentIn,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> StudioRegisterAttachmentOut:
    feats = stub_extract_from_kind(body.kind, body.mime_type)
    row = StudioAttachment(
        organization_id=ctx.organization_id,
        user_id=user.id,
        session_id=body.session_id or "default",
        storage_key=body.storage_key,
        kind=body.kind[:32],
        mime_type=body.mime_type[:128],
        width=body.width,
        height=body.height,
        description=body.description,
        extracted_features=feats,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return StudioRegisterAttachmentOut(id=row.id, storage_key=row.storage_key)

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


async def _get_or_create_conversation(
    db: AsyncSession,
    *,
    page_id: UUID,
    organization_id: UUID,
) -> Conversation:
    row = (
        await db.execute(select(Conversation).where(Conversation.page_id == page_id))
    ).scalar_one_or_none()
    if row:
        return row
    conv = Conversation(page_id=page_id, organization_id=organization_id)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.post("/generate")
async def studio_generate(
    request: Request,
    body: StudioGenerateRequest,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> StreamingResponse:
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    await rate_limit_studio_generate(request, user_id=user.id, plan=org.plan or "trial")
    r = getattr(request.app.state, "redis", None)
    slot_tok = await acquire_studio_slot(r, organization_id=ctx.organization_id, raw_plan=org.plan)
    if slot_tok is None:
        raise HTTPException(
            status_code=429,
            detail=concurrency_detail_payload(capacity=capacity_for_org_plan(org.plan)),
        )
    if body.page_id is None:
        await assert_page_generation_allowed(db, ctx.organization_id)

    if settings.USE_PRODUCT_ORCHESTRATOR:
        refining = body.page_id is not None
        from app.services.orchestration.models import PageIntent

        credit_hint = PageIntent(
            workflow="proposal",
            page_type="proposal",
            title_suggestion=body.prompt[:80] or "Untitled",
        )
        charge = compute_studio_pipeline_credits(
            credit_hint,
            refining_existing_page=refining,
        )
        bc = await check_balance(db, ctx.organization_id, charge)
        if not bc.can_proceed:
            raise HTTPException(status_code=402, detail=forge_credits_402_payload(bc))

        async def stream_product_generate() -> AsyncIterator[bytes]:
            try:
                async for chunk in stream_product_page_generation(
                    db=db,
                    ctx=ctx,
                    user=user,
                    prompt=body.prompt,
                    provider=body.provider,
                    existing_page_id=body.page_id,
                    forced_workflow=body.forced_workflow,
                    vision_attachment_ids=body.vision_attachment_ids or None,
                ):
                    yield chunk
            finally:
                await release_studio_slot(r, organization_id=ctx.organization_id, token=slot_tok)

        return StreamingResponse(
            stream_product_generate(),
            media_type="text/event-stream",
            headers=_SSE_HEADERS,
        )

    replay, prep_state = await prepare_studio_page_generation(
        db=db,
        ctx=ctx,
        user=user,
        prompt=body.prompt,
        provider=body.provider,
        existing_page_id=body.page_id,
        forced_workflow=body.forced_workflow,
        vision_attachment_ids=body.vision_attachment_ids or None,
    )
    if prep_state is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    refining = body.page_id is not None
    charge = compute_studio_pipeline_credits(
        prep_state.intent,
        refining_existing_page=refining,
    )
    bc = await check_balance(db, ctx.organization_id, charge)
    if not bc.can_proceed:
        raise HTTPException(status_code=402, detail=forge_credits_402_payload(bc))

    async def stream_legacy_generate() -> AsyncIterator[bytes]:
        try:
            for chunk in replay:
                yield chunk
            async for chunk in stream_studio_page_generation_tail(prep_state):
                yield chunk
        finally:
            await release_studio_slot(r, organization_id=ctx.organization_id, token=slot_tok)

    return StreamingResponse(
        stream_legacy_generate(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.post("/generate/continue")
async def studio_generate_continue(
    request: Request,
    body: StudioGenerateContinueRequest,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> StreamingResponse:
    """Clarify follow-up: optional ``run_id`` enforces clarify TTL (AL-03)."""
    prompt = body.prompt
    if body.run_id is not None:
        run = await db.get(OrchestrationRun, body.run_id)
        if run is None or run.organization_id != ctx.organization_id:
            raise HTTPException(status_code=404, detail="Orchestration run not found")
        if run.clarify_expires_at is None:
            raise HTTPException(status_code=400, detail="Run has no pending clarification state")
        now = datetime.now(UTC)
        exp = run.clarify_expires_at
        exp = exp.replace(tzinfo=UTC) if exp.tzinfo is None else exp.astimezone(UTC)
        if now > exp:
            raise HTTPException(status_code=410, detail="Clarification session expired")
        parts: list[str] = []
        if body.clarification_choice:
            parts.append(f"[clarification:{body.clarification_choice}]")
        if body.additional_context:
            parts.append(body.additional_context.strip())
        if parts:
            prompt = "\n".join(parts) + "\n" + prompt

    merged = StudioGenerateRequest(
        prompt=prompt,
        page_id=body.page_id,
        provider=body.provider,
        forced_workflow=body.workflow,
        session_id=body.session_id,
        vision_attachment_ids=body.vision_attachment_ids,
    )
    return await studio_generate(request, merged, db, ctx, user)


@router.post("/refine")
async def studio_refine(
    request: Request,
    body: StudioRefineRequest,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> StreamingResponse:
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    await rate_limit_studio_generate(request, user_id=user.id, plan=org.plan or "trial")
    r = getattr(request.app.state, "redis", None)
    slot_tok = await acquire_studio_slot(r, organization_id=ctx.organization_id, raw_plan=org.plan)
    if slot_tok is None:
        raise HTTPException(
            status_code=429,
            detail=concurrency_detail_payload(capacity=capacity_for_org_plan(org.plan)),
        )

    page = await db.get(Page, body.page_id)
    if page is None or page.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    hint = page.intent_json or {}
    merged = (
        f"User refinement request:\n{body.message}\n\n"
        f"Existing title: {page.title}\n"
        f"Prior intent summary: {json.dumps(hint)[:4000]}\n"
    )

    if settings.USE_PRODUCT_ORCHESTRATOR:
        from app.services.orchestration.models import PageIntent

        credit_hint = PageIntent(
            workflow="proposal",
            page_type="proposal",
            title_suggestion=merged[:160] or "Refinement",
        )
        charge = compute_studio_pipeline_credits(credit_hint, refining_existing_page=True)
        bc = await check_balance(db, ctx.organization_id, charge)
        if not bc.can_proceed:
            raise HTTPException(status_code=402, detail=forge_credits_402_payload(bc))

        async def stream_product_refine() -> AsyncIterator[bytes]:
            try:
                async for chunk in stream_product_page_generation(
                    db=db,
                    ctx=ctx,
                    user=user,
                    prompt=merged,
                    provider=body.provider,
                    existing_page_id=page.id,
                    forced_workflow=None,
                    vision_attachment_ids=body.vision_attachment_ids or None,
                ):
                    yield chunk
            finally:
                await release_studio_slot(r, organization_id=ctx.organization_id, token=slot_tok)

        return StreamingResponse(
            stream_product_refine(),
            media_type="text/event-stream",
            headers=_SSE_HEADERS,
        )

    replay, prep_state = await prepare_studio_page_generation(
        db=db,
        ctx=ctx,
        user=user,
        prompt=merged,
        provider=body.provider,
        existing_page_id=page.id,
        forced_workflow=None,
        vision_attachment_ids=body.vision_attachment_ids or None,
    )
    if prep_state is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    charge = compute_studio_pipeline_credits(
        prep_state.intent,
        refining_existing_page=True,
    )
    bc = await check_balance(db, ctx.organization_id, charge)
    if not bc.can_proceed:
        raise HTTPException(status_code=402, detail=forge_credits_402_payload(bc))

    async def stream_legacy_refine() -> AsyncIterator[bytes]:
        try:
            for chunk in replay:
                yield chunk
            async for chunk in stream_studio_page_generation_tail(prep_state):
                yield chunk
        finally:
            await release_studio_slot(r, organization_id=ctx.organization_id, token=slot_tok)

    return StreamingResponse(
        stream_legacy_refine(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.post("/sections/edit", response_model=StudioSectionEditResponse)
async def studio_section_edit(
    body: StudioSectionEditRequest,
    _user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(require_role("owner", "editor")),
) -> StudioSectionEditResponse:
    page = await db.get(Page, body.page_id)
    if page is None or page.organization_id != tenant.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    sec_charge = compute_charge("section_edit", None)
    sec_bc = await check_balance(db, tenant.organization_id, sec_charge)
    if not sec_bc.can_proceed:
        raise HTTPException(status_code=402, detail=forge_credits_402_payload(sec_bc))
    full = page.current_html or ""
    sec_html = body.html
    if not sec_html:
        extracted = extract_section_html(full, body.section_id)
        if not extracted:
            raise HTTPException(
                status_code=400,
                detail=f"Section {body.section_id!r} not found in page HTML",
            )
        sec_html = extracted
    new_sec = await edit_section_html(
        section_id=body.section_id,
        section_html=sec_html,
        instruction=body.instruction,
        provider=body.provider,
        db=db,
        organization_id=tenant.organization_id,
    )
    updated = splice_section(full, body.section_id, new_sec)
    page.current_html = updated
    db.add(
        PageRevision(
            page_id=page.id,
            organization_id=tenant.organization_id,
            html=updated,
            edit_type="section_edit",
            user_prompt=body.instruction[:2000],
            tokens_used=None,
            llm_provider=None,
            llm_model=None,
        )
    )
    await apply_charge(
        db,
        tenant.organization_id,
        action="section_edit",
        credits=sec_charge,
        user_id=_user.id,
        page_id=page.id,
        orchestration_run_id=None,
        provider=body.provider,
        model=None,
    )
    await db.commit()
    await db.refresh(page)
    await increment_section_edits(db, tenant.organization_id)
    return StudioSectionEditResponse(current_html=page.current_html or "")


@router.get("/conversations/{page_id}", response_model=StudioConversationResponse)
async def get_conversation(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> StudioConversationResponse:
    page = await db.get(Page, page_id)
    if page is None or page.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    conv = await _get_or_create_conversation(
        db,
        page_id=page_id,
        organization_id=ctx.organization_id,
    )
    rows = (
        await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.asc())
        )
    ).scalars().all()
    return StudioConversationResponse(
        page_id=page_id,
        conversation_id=conv.id,
        messages=[StudioMessageOut.model_validate(m) for m in rows],
    )


@router.post("/conversations/{page_id}/messages", response_model=StudioMessageOut)
async def post_message(
    page_id: UUID,
    body: StudioMessageCreateRequest,
    _user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> StudioMessageOut:
    page = await db.get(Page, page_id)
    if page is None or page.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    conv = await _get_or_create_conversation(
        db,
        page_id=page_id,
        organization_id=ctx.organization_id,
    )
    msg = Message(
        conversation_id=conv.id,
        organization_id=ctx.organization_id,
        role=body.role,
        content=body.content,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return StudioMessageOut.model_validate(msg)
