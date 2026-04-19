from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AutomationRule, AutomationRun, Page
from app.deps import get_db, require_role, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.automation import AutomationRuleOut, AutomationRuleUpdate, AutomationRunOut
from app.services.automations import get_or_create_rule

router = APIRouter(tags=["automations"])


@router.get("/pages/{page_id}/automations", response_model=AutomationRuleOut)
async def get_automations(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> AutomationRule:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    return await get_or_create_rule(db, page_id=p.id, organization_id=ctx.organization_id)


@router.put("/pages/{page_id}/automations", response_model=AutomationRuleOut)
async def put_automations(
    page_id: UUID,
    body: AutomationRuleUpdate,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> AutomationRule:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    rule = await get_or_create_rule(db, page_id=p.id, organization_id=ctx.organization_id)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(rule, k, v)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.get("/pages/{page_id}/automations/runs", response_model=list[AutomationRunOut])
async def list_automation_runs(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    limit: int = 50,
) -> list[AutomationRun]:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    rule = await get_or_create_rule(db, page_id=p.id, organization_id=ctx.organization_id)
    rows = (
        await db.execute(
            select(AutomationRun)
            .where(AutomationRun.automation_rule_id == rule.id)
            .order_by(AutomationRun.ran_at.desc())
            .limit(min(limit, 100))
        )
    ).scalars().all()
    return list(rows)
