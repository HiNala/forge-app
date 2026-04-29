"""Canvas projects API — AL-03."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CanvasFlow, CanvasProject, CanvasScreen, CanvasScreenRevision, Organization, Page, User
from app.deps import get_db, require_role
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.canvas import (
    CanvasExportRequest,
    CanvasFlowCreate,
    CanvasFlowOut,
    CanvasProjectCreate,
    CanvasProjectDetail,
    CanvasProjectOut,
    CanvasProjectPatch,
    CanvasRefineRequest,
    CanvasRevertRequest,
    CanvasScreenCreate,
    CanvasScreenOut,
    CanvasScreenPatch,
)
from app.services.audit_log import write_audit
from app.services.export.service import ExportService


def _slugify(text: str, *, fallback: str = "screen") -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower()).strip("-")[:72]
    return s or fallback


router = APIRouter(prefix="/canvas", tags=["canvas"])


def _project_base_query(org_id: UUID) -> Select[tuple[CanvasProject]]:
    return select(CanvasProject).where(
        CanvasProject.organization_id == org_id,
        CanvasProject.deleted_at.is_(None),
    )


def _screen_query(org_id: UUID, project_id: UUID) -> Select[tuple[CanvasScreen]]:
    return select(CanvasScreen).where(
        CanvasScreen.organization_id == org_id,
        CanvasScreen.project_id == project_id,
    )


async def _next_screen_slug(db: AsyncSession, project_id: UUID, base: str) -> str:
    root = _slugify(base)
    for i in range(0, 500):
        cand = root if i == 0 else f"{root}-{i}"
        exists = (
            await db.execute(
                select(CanvasScreen.id).where(CanvasScreen.project_id == project_id, CanvasScreen.slug == cand)
            )
        ).scalar_one_or_none()
        if exists is None:
            return cand
    return f"{root}-{datetime.now(UTC).strftime('%H%M%S')}"


async def _next_revision_version(db: AsyncSession, screen_id: UUID) -> int:
    vmax = (
        await db.execute(
            select(func.coalesce(func.max(CanvasScreenRevision.version_number), 0)).where(
                CanvasScreenRevision.screen_id == screen_id
            )
        )
    ).scalar_one()
    return int(vmax) + 1


async def _ensure_page_slug(db: AsyncSession, org_id: UUID, base_title: str) -> str:
    root = _slugify(base_title)[:60] or "canvas"
    for i in range(0, 1000):
        cand = root if i == 0 else f"{root}-{i}"
        exists = (
            await db.execute(select(Page.id).where(Page.organization_id == org_id, Page.slug == cand))
        ).scalar_one_or_none()
        if exists is None:
            return cand
    return f"{root}-page"


async def _get_project_checked(
    db: AsyncSession, ctx: TenantContext, project_id: UUID
) -> CanvasProject:
    p = await db.get(CanvasProject, project_id)
    if (
        p is None
        or p.organization_id != ctx.organization_id
        or (p.deleted_at is not None)
    ):
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _bundle_html(kind: str, screens: list[CanvasScreen]) -> str:
    """Minimal multi-screen shell for published ``custom`` GlideDesign pages."""

    tabs = "".join(f'<button type="button" data-forge-canvas-nav="{s.slug}">{s.name}</button>' for s in screens)
    blocks: list[str] = []
    for idx, s in enumerate(screens):
        disp = "block" if idx == 0 else "none"
        blocks.append(
            f'<section data-forge-canvas-screen="{s.slug}" id="screen-{s.slug}" '
            f'style="display:{disp}"><div class="forge-canvas-host">{s.html}</div></section>'
        )
    blocks_html = "".join(blocks)
    primary = screens[0].slug if screens else "main"
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{kind.replace("_"," ")} prototype</title>
<style>
body{{font-family:system-ui;margin:0;background:#0f172a;color:#f8fafc}}
.forge-bar{{display:flex;gap:8px;flex-wrap:wrap;padding:12px;background:#020617;border-bottom:1px solid #1e293b}}
.forge-bar button{{background:#2563eb;color:#fff;border:0;padding:8px 12px;border-radius:8px;cursor:pointer}}
section[data-forge-canvas-screen]{{padding:16px}}</style></head><body>
<nav class="forge-bar">{tabs}</nav>
{blocks_html}
<script>(function(){{
const first = "{primary}";
function show(slug){{
  document.querySelectorAll('[data-forge-canvas-screen]').forEach(function(el){{
    el.style.display = el.getAttribute('data-forge-canvas-screen')===slug ? 'block' : 'none';
  }});
}}
document.querySelectorAll('[data-forge-canvas-nav]').forEach(function(btn){{
  btn.addEventListener('click',function(){{
    show(btn.getAttribute('data-forge-canvas-nav'));
  }});
}});
show(first);}})();</script>
</body></html>"""


@router.post("/projects", response_model=CanvasProjectDetail)
async def create_canvas_project(
    body: CanvasProjectCreate,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> CanvasProjectDetail:
    intent_payload = dict(body.intent or {})
    intent_payload["kickoff_prompt"] = body.prompt
    proj = CanvasProject(
        organization_id=ctx.organization_id,
        kind=body.kind,
        title=body.title.strip(),
        intent_json=intent_payload,
        created_by=user.id,
    )
    db.add(proj)
    await db.flush()

    slug0 = await _next_screen_slug(db, proj.id, "home")
    screen = CanvasScreen(
        organization_id=ctx.organization_id,
        project_id=proj.id,
        name="Home",
        slug=slug0,
        screen_type="home",
        html=_starter_html(body.title.strip()),
        sort_order=0,
    )
    db.add(screen)
    await db.flush()
    vn = await _next_revision_version(db, screen.id)
    db.add(
        CanvasScreenRevision(
            organization_id=ctx.organization_id,
            screen_id=screen.id,
            version_number=vn,
            html=screen.html,
            component_tree=None,
            edit_type="initial",
            created_by=user.id,
        )
    )
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="canvas_project_created",
        resource_type="canvas_project",
        resource_id=proj.id,
        changes={
            "title": proj.title,
            "kind": str(proj.kind),
        },
    )
    await db.commit()
    proj = await _get_project_checked(db, ctx, proj.id)
    screens = (
        await db.execute(_screen_query(ctx.organization_id, proj.id).order_by(CanvasScreen.sort_order.asc()))
    ).scalars().all()
    return CanvasProjectDetail(
        project=_to_project_out(proj),
        screens=[_to_screen_out(s) for s in screens],
        flows=[],
    )


def _starter_html(title: str) -> str:
    safe = (
        title.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    return f"""<!DOCTYPE html><html><body style="margin:16px;font-family:system-ui">
<main data-forge-scope="canvas"><h1>{safe}</h1><p>Edit this screen via Studio after generation.</p></main>
</body></html>"""


@router.get("/projects", response_model=list[CanvasProjectOut])
async def list_canvas_projects(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[CanvasProjectOut]:
    stmt = (
        _project_base_query(ctx.organization_id)
        .order_by(CanvasProject.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_project_out(p) for p in rows]


@router.get("/projects/{project_id}", response_model=CanvasProjectDetail)
async def get_canvas_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
) -> CanvasProjectDetail:
    proj = await _get_project_checked(db, ctx, project_id)
    sq = _screen_query(ctx.organization_id, project_id).order_by(CanvasScreen.sort_order.asc())
    screens = (await db.execute(sq)).scalars().all()
    flows = (
        await db.execute(
            select(CanvasFlow).where(
                CanvasFlow.organization_id == ctx.organization_id,
                CanvasFlow.project_id == project_id,
            )
        )
    ).scalars().all()
    return CanvasProjectDetail(
        project=_to_project_out(proj),
        screens=[_to_screen_out(s) for s in screens],
        flows=[
            CanvasFlowOut(
                id=f.id,
                from_screen_id=f.from_screen_id,
                to_screen_id=f.to_screen_id,
                trigger_label=f.trigger_label,
            )
            for f in flows
        ],
    )


def _to_project_out(p: CanvasProject) -> CanvasProjectOut:
    return CanvasProjectOut(
        id=p.id,
        organization_id=p.organization_id,
        page_id=p.page_id,
        kind=p.kind,  # type: ignore[arg-type]
        title=p.title,
        intent_json=dict(p.intent_json or {}),
        brand_snapshot=p.brand_snapshot,
        design_tokens=p.design_tokens,
        navigation_config=p.navigation_config,
        viewport_config=p.viewport_config,
        published_at=p.published_at.isoformat() if p.published_at else None,
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat(),
    )


def _to_screen_out(s: CanvasScreen) -> CanvasScreenOut:
    return CanvasScreenOut(
        id=s.id,
        project_id=s.project_id,
        name=s.name,
        slug=s.slug,
        screen_type=s.screen_type,
        position_x=s.position_x,
        position_y=s.position_y,
        html=s.html,
        component_tree=s.component_tree,
        thumbnail_url=s.thumbnail_url,
        sort_order=s.sort_order,
    )


@router.patch("/projects/{project_id}", response_model=CanvasProjectOut)
async def patch_canvas_project(
    project_id: UUID,
    body: CanvasProjectPatch,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> CanvasProjectOut:
    proj = await _get_project_checked(db, ctx, project_id)
    if body.title is not None:
        proj.title = body.title.strip()
    if body.brand_snapshot is not None:
        proj.brand_snapshot = body.brand_snapshot
    if body.design_tokens is not None:
        proj.design_tokens = body.design_tokens
    if body.navigation_config is not None:
        proj.navigation_config = body.navigation_config
    if body.viewport_config is not None:
        proj.viewport_config = body.viewport_config
    await db.commit()
    await db.refresh(proj)
    return _to_project_out(proj)


@router.delete("/projects/{project_id}")
async def delete_canvas_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> Response:
    proj = await _get_project_checked(db, ctx, project_id)
    proj.deleted_at = datetime.now(UTC)
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="canvas_project_deleted",
        resource_type="canvas_project",
        resource_id=project_id,
        changes={},
    )
    await db.commit()
    return Response(status_code=204)


@router.post("/projects/{project_id}/screens", response_model=CanvasScreenOut)
async def add_canvas_screen(
    project_id: UUID,
    body: CanvasScreenCreate,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> CanvasScreenOut:
    await _get_project_checked(db, ctx, project_id)
    slug = await _next_screen_slug(db, project_id, body.prompt[:40])
    px = body.position_x if body.position_x is not None else Decimal(0)
    py = body.position_y if body.position_y is not None else Decimal(0)
    mx = (
        await db.execute(
            select(func.coalesce(func.max(CanvasScreen.sort_order), 0)).where(
                CanvasScreen.project_id == project_id
            )
        )
    ).scalar_one()
    html = _starter_html(body.prompt.strip()[:120])
    scr = CanvasScreen(
        organization_id=ctx.organization_id,
        project_id=project_id,
        name=(body.prompt.strip()[:80] or "Screen"),
        slug=slug,
        screen_type=body.screen_type,
        position_x=px,
        position_y=py,
        html=html,
        sort_order=int(mx) + 1,
    )
    db.add(scr)
    await db.flush()
    vn = await _next_revision_version(db, scr.id)
    db.add(
        CanvasScreenRevision(
            organization_id=ctx.organization_id,
            screen_id=scr.id,
            version_number=vn,
            html=html,
            edit_type="initial",
            created_by=user.id,
        )
    )
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="canvas_screen_created",
        resource_type="canvas_screen",
        resource_id=scr.id,
        changes={"project_id": str(project_id)},
    )
    await db.commit()
    await db.refresh(scr)
    return _to_screen_out(scr)


@router.get("/projects/{project_id}/screens/{screen_id}", response_model=CanvasScreenOut)
async def get_canvas_screen_by_id(
    project_id: UUID,
    screen_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
) -> CanvasScreenOut:
    await _get_project_checked(db, ctx, project_id)
    scr = await db.get(CanvasScreen, screen_id)
    if scr is None or scr.project_id != project_id or scr.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Screen not found")
    return _to_screen_out(scr)


@router.patch("/projects/{project_id}/screens/{screen_id}", response_model=CanvasScreenOut)
async def patch_canvas_screen(
    project_id: UUID,
    screen_id: UUID,
    body: CanvasScreenPatch,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> CanvasScreenOut:
    await _get_project_checked(db, ctx, project_id)
    scr = await db.get(CanvasScreen, screen_id)
    if scr is None or scr.project_id != project_id or scr.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Screen not found")
    if body.name is not None:
        scr.name = body.name.strip()
    if body.html is not None:
        scr.html = body.html
    if body.component_tree is not None:
        scr.component_tree = body.component_tree
    if body.position_x is not None:
        scr.position_x = body.position_x
    if body.position_y is not None:
        scr.position_y = body.position_y
    if body.sort_order is not None:
        scr.sort_order = body.sort_order
    await db.flush()
    vn = await _next_revision_version(db, scr.id)
    db.add(
        CanvasScreenRevision(
            organization_id=ctx.organization_id,
            screen_id=scr.id,
            version_number=vn,
            html=scr.html,
            component_tree=scr.component_tree,
            edit_type="manual_edit",
            created_by=user.id,
        )
    )
    await db.commit()
    await db.refresh(scr)
    return _to_screen_out(scr)


@router.delete("/projects/{project_id}/screens/{screen_id}")
async def delete_canvas_screen(
    project_id: UUID,
    screen_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> Response:
    await _get_project_checked(db, ctx, project_id)
    scr = await db.get(CanvasScreen, screen_id)
    if scr is None or scr.project_id != project_id:
        raise HTTPException(status_code=404, detail="Screen not found")
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="canvas_screen_deleted",
        resource_type="canvas_screen",
        resource_id=screen_id,
        changes={"project_id": str(project_id)},
    )
    await db.delete(scr)
    await db.commit()
    return Response(status_code=204)


@router.post("/projects/{project_id}/flows", response_model=CanvasFlowOut)
async def add_canvas_flow(
    project_id: UUID,
    body: CanvasFlowCreate,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> CanvasFlowOut:
    await _get_project_checked(db, ctx, project_id)
    for sid in (body.from_screen_id, body.to_screen_id):
        s = await db.get(CanvasScreen, sid)
        if s is None or s.project_id != project_id or s.organization_id != ctx.organization_id:
            raise HTTPException(status_code=400, detail="Invalid screen id for this project")
    fl = CanvasFlow(
        organization_id=ctx.organization_id,
        project_id=project_id,
        from_screen_id=body.from_screen_id,
        to_screen_id=body.to_screen_id,
        trigger_label=body.trigger_label,
    )
    db.add(fl)
    await db.commit()
    await db.refresh(fl)
    return CanvasFlowOut(
        id=fl.id,
        from_screen_id=fl.from_screen_id,
        to_screen_id=fl.to_screen_id,
        trigger_label=fl.trigger_label,
    )


@router.delete("/projects/{project_id}/flows/{flow_id}")
async def delete_canvas_flow(
    project_id: UUID,
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Response:
    await _get_project_checked(db, ctx, project_id)
    fl = await db.get(CanvasFlow, flow_id)
    if fl is None or fl.project_id != project_id or fl.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Flow not found")
    await db.delete(fl)
    await db.commit()
    return Response(status_code=204)


@router.post("/projects/{project_id}/publish", response_model=CanvasProjectOut)
async def publish_canvas_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> CanvasProjectOut:
    proj = await _get_project_checked(db, ctx, project_id)
    screens = (
        await db.execute(_screen_query(ctx.organization_id, project_id).order_by(CanvasScreen.sort_order.asc()))
    ).scalars().all()
    if not screens:
        raise HTTPException(status_code=400, detail="Nothing to publish — add screens first.")
    slug = await _ensure_page_slug(db, ctx.organization_id, proj.title)
    html_bundle = _bundle_html(proj.kind, list(screens))
    if proj.page_id:
        pg = await db.get(Page, proj.page_id)
        if pg and pg.organization_id == ctx.organization_id:
            pg.current_html = html_bundle
            pg.title = proj.title
            pg.intent_json = {
                **(pg.intent_json or {}),
                "canvas_project_id": str(proj.id),
                "canvas_kind": proj.kind,
            }
            proj.published_at = datetime.now(UTC)
            await write_audit(
                db,
                organization_id=ctx.organization_id,
                actor_user_id=user.id,
                action="canvas_project_published",
                resource_type="canvas_project",
                resource_id=proj.id,
                changes={"page_id": str(proj.page_id)},
            )
            await db.commit()
            await db.refresh(proj)
            return _to_project_out(proj)

    page = Page(
        organization_id=ctx.organization_id,
        slug=slug,
        page_type="custom",
        title=proj.title,
        current_html=html_bundle,
        intent_json={"canvas_project_id": str(proj.id), "canvas_kind": proj.kind},
        status="draft",
        created_by_user_id=user.id,
    )
    db.add(page)
    await db.flush()
    proj.page_id = page.id
    proj.published_at = datetime.now(UTC)
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="canvas_project_published",
        resource_type="canvas_project",
        resource_id=proj.id,
        changes={"page_id": str(page.id)},
    )
    await db.commit()
    await db.refresh(proj)
    return _to_project_out(proj)


@router.post("/projects/{project_id}/export")
async def export_canvas_project(
    project_id: UUID,
    body: CanvasExportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> dict[str, object]:
    proj = await _get_project_checked(db, ctx, project_id)
    if proj.page_id is None:
        raise HTTPException(status_code=400, detail="Publish before exporting tied to GlideDesign hosting.")
    page = await db.get(Page, proj.page_id)
    if page is None or page.organization_id != ctx.organization_id:
        raise HTTPException(status_code=400, detail="Linked page missing")
    org = await db.get(Organization, ctx.organization_id)
    assert org is not None
    svc = ExportService()
    kind, payload = await svc.run(
        db=db,
        page=page,
        org=org,
        user=user,
        request=request,
        format_id=body.format,
    )
    audit_action = "canvas_export_requested" if kind != "error" else "canvas_export_failed"
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action=audit_action,
        resource_type="canvas_project",
        resource_id=project_id,
        changes={"format_id": body.format, "result_kind": kind},
    )
    await db.commit()
    return {"kind": kind, "payload": payload}


@router.post("/projects/{project_id}/screens/{screen_id}/refine")
async def refine_canvas_screen(
    project_id: UUID,
    screen_id: UUID,
    body: CanvasRefineRequest,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> dict[str, object]:
    """Record a canvas refine note and revision without implying live AI rewrite."""

    await _get_project_checked(db, ctx, project_id)
    scr = await db.get(CanvasScreen, screen_id)
    if scr is None or scr.project_id != project_id or scr.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Screen not found")

    snippet = "\n<!-- canvas refine note:\n" + body.prompt.replace("--", "\\-\\-")[:1800] + "\n-->\n"
    merged = scr.html.rstrip() + snippet
    scr.html = merged
    vn = await _next_revision_version(db, scr.id)
    db.add(
        CanvasScreenRevision(
            organization_id=ctx.organization_id,
            screen_id=scr.id,
            version_number=vn,
            html=merged,
            component_tree=scr.component_tree,
            edit_type="region_edit",
            region_scope={
                "scope": body.scope,
                "element_ref": body.element_ref,
            },
            created_by=user.id,
        )
    )
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="canvas_screen_refined",
        resource_type="canvas_screen",
        resource_id=screen_id,
        changes={"revision": vn, "edit_type": "region_edit"},
    )
    await db.commit()
    return {
        "screen_id": str(scr.id),
        "revision": vn,
        "html": merged,
        "message": "Refinement note saved to this screen.",
    }


@router.post("/projects/{project_id}/screens/{screen_id}/revert", response_model=CanvasScreenOut)
async def revert_canvas_screen_revision(
    project_id: UUID,
    screen_id: UUID,
    body: CanvasRevertRequest,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> CanvasScreenOut:
    await _get_project_checked(db, ctx, project_id)
    scr = await db.get(CanvasScreen, screen_id)
    rev = (
        await db.execute(
            select(CanvasScreenRevision).where(
                CanvasScreenRevision.id == body.revision_id,
                CanvasScreenRevision.screen_id == screen_id,
                CanvasScreenRevision.organization_id == ctx.organization_id,
            )
        )
    ).scalar_one_or_none()
    if scr is None or scr.project_id != project_id or rev is None:
        raise HTTPException(status_code=404, detail="Revision not found")

    scr.html = rev.html
    scr.component_tree = rev.component_tree
    vn = await _next_revision_version(db, scr.id)
    db.add(
        CanvasScreenRevision(
            organization_id=ctx.organization_id,
            screen_id=scr.id,
            version_number=vn,
            html=rev.html,
            component_tree=rev.component_tree,
            edit_type="revert",
            created_by=user.id,
        )
    )
    await db.commit()
    await db.refresh(scr)
    return _to_screen_out(scr)
