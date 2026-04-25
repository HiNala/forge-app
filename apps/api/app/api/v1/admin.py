from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.platform_auth import require_any_platform_access
from app.db.models import AnalyticsEvent, OrchestrationRun, Page, Template
from app.db.models import User as UserModel
from app.deps import get_admin_db
from app.deps.forge_operator import require_forge_operator
from app.deps.tenant import TenantContext
from app.schemas.template import (
    AdminTemplateCreate,
    AdminTemplateOut,
    AdminTemplatePatch,
    TemplateFromPageIn,
    TemplateStatsOut,
    TemplateStatsRow,
)
from app.services.ai.metrics import snapshot_last_minute
from app.services.queue import enqueue_template_preview

router = APIRouter(prefix="/admin", tags=["admin"])


def _normalize_slug(raw: str) -> str:
    s = raw.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    if not s:
        raise HTTPException(status_code=400, detail="Invalid slug")
    return s[:120]


@router.get("/orchestration-quality")
async def admin_orchestration_quality(
    db: AsyncSession = Depends(get_admin_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> dict[str, Any]:
    """Aggregate review scores from recent orchestration runs (O-04)."""
    del _ctx
    rows = (
        await db.execute(
            select(OrchestrationRun)
            .where(OrchestrationRun.review_findings.isnot(None))
            .order_by(OrchestrationRun.created_at.desc())
            .limit(800)
        )
    ).scalars().all()
    scores: list[int] = []
    by_workflow: dict[str, list[int]] = {}
    for r in rows:
        rf = r.review_findings
        if not isinstance(rf, dict):
            continue
        qs = rf.get("quality_score")
        if not isinstance(qs, (int, float)):
            continue
        qv = int(qs)
        scores.append(qv)
        intent = r.intent or {}
        wf = str(intent.get("workflow") or intent.get("page_type") or "unknown")
        by_workflow.setdefault(wf, []).append(qv)
    avg = sum(scores) / len(scores) if scores else None
    wf_avg = {k: sum(v) / len(v) for k, v in by_workflow.items() if v}
    total = (await db.execute(select(func.count(OrchestrationRun.id)))).scalar_one()
    return {
        "samples_with_review": len(scores),
        "avg_quality_score": avg,
        "avg_by_workflow": wf_avg,
        "orchestration_runs_total": int(total),
    }


@router.get("/llm-stats")
async def admin_llm_stats(
    _db: AsyncSession = Depends(get_admin_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> dict[str, Any]:
    """In-memory LLM metrics (tokens/min, cache hits) — Mission 03."""
    del _db, _ctx
    return snapshot_last_minute()


@router.get("/templates", response_model=list[AdminTemplateOut])
async def admin_list_templates(
    db: AsyncSession = Depends(get_admin_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> list[Template]:
    rows = (
        await db.execute(select(Template).order_by(Template.sort_order.asc(), Template.name.asc()))
    ).scalars().all()
    return list(rows)


@router.post("/templates", response_model=AdminTemplateOut)
async def admin_create_template(
    request: Request,
    body: AdminTemplateCreate,
    db: AsyncSession = Depends(get_admin_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> Template:
    slug = _normalize_slug(body.slug)
    exists = (
        await db.execute(select(Template.id).where(Template.slug == slug))
    ).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status_code=409, detail="Slug already used")
    row = Template(
        slug=slug,
        name=body.name,
        description=body.description,
        category=body.category,
        html=body.html,
        form_schema=body.form_schema,
        intent_json=body.intent_json,
        is_published=body.is_published,
        sort_order=body.sort_order,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await enqueue_template_preview(request.app.state, str(row.id))
    return row


@router.patch("/templates/{template_id}", response_model=AdminTemplateOut)
async def admin_patch_template(
    request: Request,
    template_id: UUID,
    body: AdminTemplatePatch,
    db: AsyncSession = Depends(get_admin_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> Template:
    row = await db.get(Template, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    if body.slug is not None:
        ns = _normalize_slug(body.slug)
        clash = (
            await db.execute(
                select(Template.id).where(Template.slug == ns, Template.id != template_id)
            )
        ).scalar_one_or_none()
        if clash is not None:
            raise HTTPException(status_code=409, detail="Slug already used")
        row.slug = ns
    if body.name is not None:
        row.name = body.name
    if body.description is not None:
        row.description = body.description
    if body.category is not None:
        row.category = body.category
    if body.html is not None:
        row.html = body.html
    if body.form_schema is not None:
        row.form_schema = body.form_schema
    if body.intent_json is not None:
        row.intent_json = body.intent_json
    if body.is_published is not None:
        row.is_published = body.is_published
    if body.sort_order is not None:
        row.sort_order = body.sort_order
    await db.commit()
    await db.refresh(row)
    if body.html is not None:
        await enqueue_template_preview(request.app.state, str(row.id))
    return row


@router.delete("/templates/{template_id}")
async def admin_delete_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_admin_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> dict[str, str]:
    row = await db.get(Template, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(row)
    await db.commit()
    return {"status": "deleted"}


@router.post("/templates/from-page", response_model=AdminTemplateOut)
async def admin_template_from_page(
    request: Request,
    body: TemplateFromPageIn,
    db: AsyncSession = Depends(get_admin_db),
    ctx: TenantContext = Depends(require_forge_operator),
) -> Template:
    page = await db.get(Page, body.page_id)
    if page is None or page.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Page not found")
    base = _normalize_slug(page.slug)[:80]
    slug = base
    n = 0
    while True:
        exists = (
            await db.execute(select(Template.id).where(Template.slug == slug))
        ).scalar_one_or_none()
        if exists is None:
            break
        n += 1
        slug = f"{base}-{n}"

    intent = dict(page.intent_json or {})
    intent["source_page_id"] = str(page.id)

    row = Template(
        slug=slug,
        name=page.title,
        description=f"Cloned from page {page.slug}",
        category="custom",
        html=page.current_html or "",
        form_schema=page.form_schema,
        intent_json=intent,
        is_published=False,
        sort_order=999,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await enqueue_template_preview(request.app.state, str(row.id))
    return row


@router.post("/templates/{template_id}/regenerate-preview", response_model=AdminTemplateOut)
async def admin_regenerate_template_preview(
    request: Request,
    template_id: UUID,
    db: AsyncSession = Depends(get_admin_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> Template:
    row = await db.get(Template, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    await enqueue_template_preview(request.app.state, str(row.id))
    return row


@router.get("/templates/stats", response_model=TemplateStatsOut)
async def admin_template_stats(
    db: AsyncSession = Depends(get_admin_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> TemplateStatsOut:
    since = datetime.now(UTC) - timedelta(days=90)
    events = (
        await db.execute(
            select(AnalyticsEvent).where(
                AnalyticsEvent.event_type == "template_use_click",
                AnalyticsEvent.created_at >= since,
            )
        )
    ).scalars().all()
    tid_to_count: dict[str, int] = {}
    for ev in events:
        md = ev.metadata_ or {}
        tid = md.get("template_id")
        if isinstance(tid, str) and tid:
            tid_to_count[tid] = tid_to_count.get(tid, 0) + 1

    templates = (await db.execute(select(Template))).scalars().all()
    name_by_id = {str(t.id): t.name for t in templates}

    top: list[TemplateStatsRow] = []
    for tid, cnt in sorted(tid_to_count.items(), key=lambda x: -x[1])[:25]:
        top.append(
            TemplateStatsRow(
                template_id=UUID(tid),
                template_name=name_by_id.get(tid, "(unknown)"),
                use_count=cnt,
            )
        )
    return TemplateStatsOut(top_templates=top)


@router.get("/platform/health")
async def platform_admin_health(
    _u: UserModel = Depends(require_any_platform_access),
) -> dict[str, bool]:
    """Confirms the caller has at least one platform permission (including legacy ``is_admin``)."""
    return {"ok": True}
