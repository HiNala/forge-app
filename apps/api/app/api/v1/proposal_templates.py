"""Proposal template library (W-02)."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ProposalTemplate, User
from app.deps import get_db, require_role, require_tenant
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.proposal_api import ProposalTemplateCreate, ProposalTemplateOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/proposal-templates", tags=["proposal-templates"])


@router.get("", response_model=list[ProposalTemplateOut])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> list[ProposalTemplate]:
    q = await db.execute(
        select(ProposalTemplate)
        .where(
            or_(
                ProposalTemplate.organization_id == ctx.organization_id,
                ProposalTemplate.organization_id.is_(None),
            )
        )
        .order_by(ProposalTemplate.is_system.desc(), ProposalTemplate.name)
    )
    return list(q.scalars().all())


@router.post("", response_model=ProposalTemplateOut)
async def create_template(
    body: ProposalTemplateCreate,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> ProposalTemplate:
    row = ProposalTemplate(
        organization_id=ctx.organization_id,
        name=body.name,
        description=body.description,
        scope_blueprint=body.scope_blueprint,
        line_items_blueprint=body.line_items_blueprint,
        terms_template=body.terms_template,
        is_system=False,
        created_by=user.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


@router.post("/{template_id}/use", response_model=dict[str, str])
async def use_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> dict[str, str]:
    """Increment use_count; Studio creates pages separately."""
    row = await db.get(ProposalTemplate, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    if row.organization_id not in (None, ctx.organization_id):
        raise HTTPException(status_code=403, detail="Not allowed")
    row.use_count = (row.use_count or 0) + 1
    await db.commit()
    return {"status": "ok", "template_id": str(template_id)}
