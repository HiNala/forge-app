from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.db.models import Conversation, Message, Organization, Page, PageRevision, User
from app.deps import get_db, require_role, require_tenant, require_user
from app.deps.tenant import TenantContext
from app.schemas.studio import (
    StudioConversationResponse,
    StudioGenerateRequest,
    StudioMessageCreateRequest,
    StudioMessageOut,
    StudioRefineRequest,
    StudioSectionEditRequest,
    StudioSectionEditResponse,
)
from app.services.ai.usage import (
    assert_page_generation_allowed,
    increment_section_edits,
    usage_snapshot,
)
from app.services.orchestration.pipeline import stream_page_generation
from app.services.orchestration.section_editor import (
    edit_section_html,
    extract_section_html,
    splice_section,
)
from app.services.rate_limit_studio import rate_limit_studio_generate

router = APIRouter(prefix="/studio", tags=["studio"])


@router.get("/usage")
async def studio_usage(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    """Monthly quota + token usage for the active org (Studio UI)."""
    return await usage_snapshot(db, ctx.organization_id)

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
    if body.page_id is None:
        await assert_page_generation_allowed(db, ctx.organization_id)

    async def gen() -> AsyncIterator[bytes]:
        async for chunk in stream_page_generation(
            db=db,
            ctx=ctx,
            user=user,
            prompt=body.prompt,
            provider=body.provider,
            existing_page_id=body.page_id,
            forced_workflow=body.forced_workflow,
        ):
            yield chunk

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


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

    page = await db.get(Page, body.page_id)
    if page is None or page.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    hint = page.intent_json or {}
    merged = (
        f"User refinement request:\n{body.message}\n\n"
        f"Existing title: {page.title}\n"
        f"Prior intent summary: {json.dumps(hint)[:4000]}\n"
    )

    async def gen_refine() -> AsyncIterator[bytes]:
        async for chunk in stream_page_generation(
            db=db,
            ctx=ctx,
            user=user,
            prompt=merged,
            provider=body.provider,
            existing_page_id=page.id,
            forced_workflow=None,
        ):
            yield chunk

    return StreamingResponse(
        gen_refine(),
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
