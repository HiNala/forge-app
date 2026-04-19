"""Public proposal view, Q&A, accept / decline (W-02)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Organization, Page, Proposal, ProposalQuestion
from app.db.rls_context import set_active_organization
from app.deps.db import get_db_public
from app.schemas.proposal_api import (
    ProposalPublicAccept,
    ProposalPublicDecline,
    ProposalQuestionIn,
)
from app.services.proposal_service import ensure_proposal_number
from app.services.public_submission import anonymize_ipv4_to_slash24
from app.services.queue import enqueue_proposal_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/p", tags=["public-proposal"])


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@router.post("/{org_slug}/{page_slug}/proposal/view")
async def public_proposal_view(
    org_slug: str,
    page_slug: str,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> dict[str, str]:
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")
    await set_active_organization(db, org.id)
    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
                Page.page_type == "proposal",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")
    prop = (
        await db.execute(select(Proposal).where(Proposal.page_id == p.id))
    ).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    now = datetime.now(UTC)
    if prop.first_viewed_at is None:
        prop.first_viewed_at = now
        if prop.status == "sent":
            prop.status = "viewed"
        await db.commit()
    return {"status": "recorded"}


@router.post("/{org_slug}/{page_slug}/proposal/question")
async def public_proposal_question(
    org_slug: str,
    page_slug: str,
    body: ProposalQuestionIn,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> dict[str, str]:
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")
    await set_active_organization(db, org.id)
    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
                Page.page_type == "proposal",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")
    ip = _client_ip(request)
    ip_anon = anonymize_ipv4_to_slash24(ip)
    q = ProposalQuestion(
        organization_id=org.id,
        page_id=p.id,
        asker_name=body.asker_name,
        asker_email=body.asker_email,
        section_ref=body.section_ref,
        question=body.question,
        asker_ip=ip_anon,
    )
    db.add(q)
    prop = (
        await db.execute(select(Proposal).where(Proposal.page_id == p.id))
    ).scalar_one_or_none()
    if prop and prop.status in ("sent", "viewed"):
        prop.status = "questioned"
    await db.commit()
    return {"status": "received"}


@router.post("/{org_slug}/{page_slug}/proposal/accept")
async def public_proposal_accept(
    org_slug: str,
    page_slug: str,
    body: ProposalPublicAccept,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> dict[str, str]:
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")
    await set_active_organization(db, org.id)
    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
                Page.page_type == "proposal",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")
    prop = (
        await db.execute(select(Proposal).where(Proposal.page_id == p.id))
    ).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Not found")
    now = datetime.now(UTC)
    if prop.expires_at and prop.expires_at.replace(tzinfo=UTC) < now:
        raise HTTPException(status_code=409, detail="This proposal has expired")
    if prop.status in ("accepted", "declined", "superseded", "expired"):
        raise HTTPException(
            status_code=409,
            detail="This proposal is no longer open for acceptance",
        )
    if prop.status not in ("sent", "viewed", "questioned"):
        raise HTTPException(status_code=400, detail="Proposal is not in an acceptable state")

    ip = _client_ip(request)
    ua = (request.headers.get("user-agent") or "")[:4000]

    prop.status = "accepted"
    prop.decision_at = now
    prop.decision_by_name = body.name
    prop.decision_by_email = body.email
    prop.decision_ip = anonymize_ipv4_to_slash24(ip)
    prop.decision_user_agent = ua
    prop.decision_signature_kind = body.signature_kind
    prop.decision_signature_data = body.signature_data
    await ensure_proposal_number(db, proposal=prop)
    await db.commit()

    await enqueue_proposal_pdf(request.app.state, str(prop.page_id))
    return {"status": "accepted", "proposal_number": prop.proposal_number or ""}


@router.post("/{org_slug}/{page_slug}/proposal/decline")
async def public_proposal_decline(
    org_slug: str,
    page_slug: str,
    body: ProposalPublicDecline,
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> dict[str, str]:
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Not found")
    await set_active_organization(db, org.id)
    p = (
        await db.execute(
            select(Page).where(
                Page.organization_id == org.id,
                Page.slug == page_slug,
                Page.status == "live",
                Page.page_type == "proposal",
            )
        )
    ).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=404, detail="Not found")
    prop = (
        await db.execute(select(Proposal).where(Proposal.page_id == p.id))
    ).scalar_one_or_none()
    if prop is None:
        raise HTTPException(status_code=404, detail="Not found")
    if prop.status in ("accepted", "declined", "superseded", "expired"):
        raise HTTPException(status_code=409, detail="Already decided")
    prop.status = "declined"
    prop.decision_at = datetime.now(UTC)
    prop.decision_ip = anonymize_ipv4_to_slash24(_client_ip(request))
    md = dict(prop.metadata_ or {})
    if body.reason:
        md["decline_reason"] = body.reason[:4000]
    prop.metadata_ = md or prop.metadata_
    await db.commit()
    return {"status": "declined"}
