"""Pitch deck nested under pages (W-03)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Deck, Organization, Page, PageRevision
from app.deps import get_db, require_role, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.deck_api import DeckExportIn, DeckExportOut, DeckOut, DeckPatch
from app.services.deck_render import render_deck_html
from app.services.deck_service import get_or_create_deck_for_page
from app.services.queue import enqueue_deck_export

router = APIRouter()


@router.get("/{page_id}/deck", response_model=DeckOut)
async def get_page_deck(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> Deck:
    p = (
        await db.execute(
            select(Page).where(
                Page.id == page_id,
                Page.organization_id == ctx.organization_id,
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Page not found")
    if p.page_type != "pitch_deck":
        raise HTTPException(status_code=400, detail="Not a pitch deck page")
    row = await get_or_create_deck_for_page(db, page=p)
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/{page_id}/deck", response_model=DeckOut)
async def patch_page_deck(
    page_id: UUID,
    body: DeckPatch,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Deck:
    p = (
        await db.execute(
            select(Page).where(
                Page.id == page_id,
                Page.organization_id == ctx.organization_id,
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Page not found")
    if p.page_type != "pitch_deck":
        raise HTTPException(status_code=400, detail="Not a pitch deck page")
    row = await get_or_create_deck_for_page(db, page=p)
    data = body.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(row, k, v)
    if body.slides is not None:
        row.slide_count = len(body.slides)
    org = await db.get(Organization, ctx.organization_id)
    if org is not None:
        primary = "#2563EB"
        secondary = "#0F172A"
        snap = p.brand_kit_snapshot if isinstance(p.brand_kit_snapshot, dict) else {}
        if snap.get("primary_color"):
            primary = str(snap["primary_color"])
        if snap.get("secondary_color"):
            secondary = str(snap["secondary_color"])
        p.current_html = render_deck_html(
            org_name=org.name,
            org_slug=org.slug,
            page=p,
            deck=row,
            primary=primary,
            secondary=secondary,
        )
        db.add(
            PageRevision(
                page_id=p.id,
                organization_id=ctx.organization_id,
                html=p.current_html,
                edit_type="deck_edit",
                user_prompt="deck patch",
                tokens_used=None,
                llm_provider=None,
                llm_model=None,
            )
        )
        db.add(p)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/{page_id}/deck/export", response_model=DeckExportOut)
async def export_page_deck(
    page_id: UUID,
    body: DeckExportIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> DeckExportOut:
    p = (
        await db.execute(
            select(Page).where(
                Page.id == page_id,
                Page.organization_id == ctx.organization_id,
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Page not found")
    if p.page_type != "pitch_deck":
        raise HTTPException(status_code=400, detail="Not a pitch deck page")
    row = (
        await db.execute(select(Deck).where(Deck.page_id == p.id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Deck not found")
    queued = await enqueue_deck_export(request.app.state, str(p.id), body.format)
    return DeckExportOut(
        status="queued",
        format=body.format,
        message=(
            "Export job enqueued (deck_export worker)."
            if queued
            else "Export accepted; worker is not connected in this environment."
        ),
    )
