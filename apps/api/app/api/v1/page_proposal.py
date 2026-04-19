"""Proposal CRUD nested under pages (W-02)."""

from __future__ import annotations

import logging
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.db.models import Organization, Page, Proposal, ProposalQuestion
from app.deps import get_db, require_role, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.proposal_api import ProposalOut, ProposalPatch
from app.services.proposal_render import render_proposal_html
from app.services.proposal_service import (
    compute_totals,
    get_or_create_proposal_for_page,
    recompute_line_totals,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{page_id}/proposal", response_model=ProposalOut)
async def get_page_proposal(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> Proposal:
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
    if p.page_type != "proposal":
        raise HTTPException(status_code=400, detail="Not a proposal page")
    row = await get_or_create_proposal_for_page(db, page=p)
    await db.commit()
    await db.refresh(row)
    return row


@router.patch("/{page_id}/proposal", response_model=ProposalOut)
async def patch_page_proposal(
    page_id: UUID,
    body: ProposalPatch,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),  # includes tenant
) -> Proposal:
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
    if p.page_type != "proposal":
        raise HTTPException(status_code=400, detail="Not a proposal page")
    row = await get_or_create_proposal_for_page(db, page=p)
    data = body.model_dump(exclude_none=True)
    if "metadata" in data:
        data["metadata_"] = data.pop("metadata")
    for k, v in data.items():
        setattr(row, k, v)

    if body.line_items is not None:
        row.line_items = recompute_line_totals(body.line_items)
    else:
        row.line_items = recompute_line_totals(row.line_items)
    tax_bps = row.tax_rate_bps or 0
    sub, tax, tot = compute_totals(row.line_items, tax_rate_bps=tax_bps)
    row.subtotal_cents = sub
    row.tax_cents = tax
    row.total_cents = tot

    org = await db.get(Organization, ctx.organization_id)
    if org is not None:
        primary = "#2563EB"
        secondary = "#0F172A"
        snap = p.brand_kit_snapshot if isinstance(p.brand_kit_snapshot, dict) else {}
        if snap.get("primary_color"):
            primary = str(snap["primary_color"])
        if snap.get("secondary_color"):
            secondary = str(snap["secondary_color"])
        p.current_html = render_proposal_html(
            org_name=org.name,
            org_slug=org.slug,
            page=p,
            proposal=row,
            primary=primary,
            secondary=secondary,
        )
        db.add(p)

    await db.commit()
    await db.refresh(row)
    return row


@router.get("/{page_id}/proposal/pdf")
async def download_proposal_pdf(
    page_id: UUID,
    version: str = "draft",
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, str]:
    """Draft PDF: enqueue render. Signed PDF: return key or 404 when missing."""
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
    if p.page_type != "proposal":
        raise HTTPException(status_code=400, detail="Not a proposal page")
    proposal = (
        await db.execute(select(Proposal).where(Proposal.page_id == p.id))
    ).scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if version == "signed":
        if not proposal.signed_pdf_storage_key:
            raise HTTPException(status_code=404, detail="Signed PDF not available yet")
        return {"version": "signed", "storage_key": proposal.signed_pdf_storage_key}
    return {
        "version": "draft",
        "status": "queued",
        "message": (
            "PDF generation is processed asynchronously; use proposal_pdf_render job in worker."
        ),
    }


@router.post("/{page_id}/proposal/change-order", response_model=dict[str, str])
async def create_change_order(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> dict[str, str]:
    """Create a child proposal page pre-filled from the parent; parent moves to superseded."""
    parent = (
        await db.execute(
            select(Page).where(
                Page.id == page_id,
                Page.organization_id == ctx.organization_id,
            )
        )
    ).scalar_one_or_none()
    if parent is None:
        raise HTTPException(status_code=404, detail="Page not found")
    if parent.page_type != "proposal":
        raise HTTPException(status_code=400, detail="Not a proposal page")
    p_old = (
        await db.execute(select(Proposal).where(Proposal.page_id == parent.id))
    ).scalar_one_or_none()
    if p_old is None:
        raise HTTPException(status_code=404, detail="Proposal not found")

    slug = f"{parent.slug}-co-{uuid.uuid4().hex[:8]}"
    child = Page(
        organization_id=ctx.organization_id,
        slug=slug,
        page_type="proposal",
        title=f"{parent.title} (change order)",
        current_html=parent.current_html or "",
        form_schema=parent.form_schema,
        intent_json=parent.intent_json,
    )
    db.add(child)
    await db.flush()

    p_new = Proposal(
        page_id=child.id,
        organization_id=ctx.organization_id,
        client_name=p_old.client_name,
        client_email=p_old.client_email,
        client_phone=p_old.client_phone,
        client_address=p_old.client_address,
        project_title=p_old.project_title,
        project_location=p_old.project_location,
        executive_summary=p_old.executive_summary,
        scope_of_work=list(p_old.scope_of_work or []),
        exclusions=list(p_old.exclusions or []),
        line_items=list(p_old.line_items or []),
        subtotal_cents=p_old.subtotal_cents,
        tax_rate_bps=p_old.tax_rate_bps,
        tax_cents=p_old.tax_cents,
        total_cents=p_old.total_cents,
        currency=p_old.currency,
        timeline=list(p_old.timeline or []),
        start_date=p_old.start_date,
        estimated_completion_date=p_old.estimated_completion_date,
        payment_terms=p_old.payment_terms,
        payment_schedule=p_old.payment_schedule,
        warranty=p_old.warranty,
        insurance=p_old.insurance,
        license_info=p_old.license_info,
        legal_terms=p_old.legal_terms,
        expires_at=p_old.expires_at,
        parent_proposal_id=parent.id,
        status="draft",
    )
    db.add(p_new)
    p_old.status = "superseded"
    unanswered = (
        await db.execute(
            select(ProposalQuestion).where(
                ProposalQuestion.page_id == parent.id,
                ProposalQuestion.answer.is_(None),
            )
        )
    ).scalars().all()
    for q in unanswered:
        db.add(
            ProposalQuestion(
                organization_id=ctx.organization_id,
                page_id=child.id,
                asker_name=q.asker_name,
                asker_email=q.asker_email,
                section_ref=q.section_ref,
                question=q.question,
                asker_ip=q.asker_ip,
            )
        )
    md_new = dict(p_old.metadata_ or {})
    md_new["carried_unanswered_questions_from"] = str(parent.id)
    p_new.metadata_ = md_new
    flag_modified(p_new, "metadata_")
    await db.commit()
    return {"new_page_id": str(child.id), "slug": slug}
