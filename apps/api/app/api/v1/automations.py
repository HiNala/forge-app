from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AutomationRule, AutomationRun, Page
from app.deps import get_db, require_role, require_tenant
from app.deps.api_scopes import require_api_scopes
from app.deps.tenant import TenantContext
from app.schemas.automation import (
    AutomationFailureRow,
    AutomationRuleOut,
    AutomationRuleUpdate,
    AutomationRunOut,
)
from app.services.automations import AutomationEngine, get_or_create_rule

router = APIRouter(tags=["automations"])


@router.get("/automations/failure-summary")
async def automation_failure_summary(
    _: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    """Dashboard banner: count failed automation steps in the last 24h (Mission 05)."""
    since = datetime.now(UTC) - timedelta(hours=24)
    n = (
        await db.execute(
            select(func.count())
            .select_from(AutomationRun)
            .where(
                AutomationRun.organization_id == ctx.organization_id,
                AutomationRun.status == "failed",
                AutomationRun.ran_at >= since,
            )
        )
    ).scalar_one()
    return {"failed_last_24h": int(n or 0)}


@router.get("/automations/failures", response_model=list[AutomationFailureRow])
async def list_org_automation_failures(
    _: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    days: int = 30,
    limit: int = 100,
) -> list[AutomationFailureRow]:
    since = datetime.now(UTC) - timedelta(days=min(days, 90))
    rows = (
        await db.execute(
            select(AutomationRun, AutomationRule.page_id)
            .join(AutomationRule, AutomationRun.automation_rule_id == AutomationRule.id)
            .where(
                AutomationRun.organization_id == ctx.organization_id,
                AutomationRun.status == "failed",
                AutomationRun.ran_at >= since,
            )
            .order_by(AutomationRun.ran_at.desc())
            .limit(min(limit, 200))
        )
    ).all()
    out: list[AutomationFailureRow] = []
    for run, page_id in rows:
        out.append(
            AutomationFailureRow(
                id=run.id,
                page_id=page_id,
                submission_id=run.submission_id,
                step=run.step,
                error_message=run.error_message,
                ran_at=run.ran_at,
            )
        )
    return out


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


@router.post("/pages/{page_id}/automations/runs/{run_id}/retry")
async def retry_automation_run(
    page_id: UUID,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> dict[str, bool]:
    """Re-run the automation pipeline for the submission linked to a failed run."""
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    rule = await get_or_create_rule(db, page_id=p.id, organization_id=ctx.organization_id)
    run = await db.get(AutomationRun, run_id)
    if (
        run is None
        or run.automation_rule_id != rule.id
        or run.organization_id != ctx.organization_id
    ):
        raise HTTPException(status_code=404, detail="Run not found")
    if run.status != "failed":
        raise HTTPException(status_code=400, detail="Only failed runs can be retried")
    if run.submission_id is None:
        raise HTTPException(status_code=400, detail="Run has no submission")
    engine = AutomationEngine(db)
    await engine.run_for_submission(run.submission_id)
    return {"ok": True}
