"""Page export / handoff — unified formats list + run (P-07)."""

from __future__ import annotations

from dataclasses import asdict
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Organization, Page, Submission, User
from app.deps import get_db, require_tenant
from app.deps.api_scopes import require_api_scopes
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.export_api import (
    ExportFormatItemOut,
    ExportFormatsOut,
    ExportRunIn,
)
from app.services.export.service import export_service
from app.services.submissions_csv import iter_submission_csv_rows

router = APIRouter(prefix="/pages", tags=["page-exports"])


@router.get("/{page_id}/export/formats", response_model=ExportFormatsOut)
async def get_page_export_formats(
    page_id: UUID,
    _scopes: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> ExportFormatsOut:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="not_found")
    org = await db.get(Organization, ctx.organization_id)
    raw = export_service.list_formats(p, org)
    return ExportFormatsOut(formats=[ExportFormatItemOut.model_validate(asdict(x)) for x in raw])


@router.post("/{page_id}/export")
async def run_page_export(
    page_id: UUID,
    body: ExportRunIn,
    request: Request,
    _scopes: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> Response:
    _ = user
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="not_found")
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="org_not_found")

    kind, payload = await export_service.run(
        db=db,
        page=p,
        org=org,
        user=user,
        request=request,
        format_id=body.format,
    )
    if kind == "error" and isinstance(payload, dict):
        code = str(payload.get("code", "error"))
        if code == "plan_locked":
            raise HTTPException(status_code=403, detail=payload.get("message", "forbidden"))
        if code in ("not_implemented", "not_allowed", "unsupported", "no_content"):
            raise HTTPException(status_code=400, detail=payload.get("message", "bad_request"))
        raise HTTPException(status_code=400, detail=payload.get("message", "error"))

    if kind == "html" and isinstance(payload, bytes):
        safe_slug = "".join(c if c.isalnum() or c in "-_" else "-" for c in (p.slug or "page"))[:80]
        return Response(
            content=payload,
            media_type="text/html; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{safe_slug}.html"'},
        )

    if kind == "text" and isinstance(payload, bytes):
        return Response(
            content=payload,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="forge-handoff-notes.txt"'},
        )

    if kind == "submissions_csv" and isinstance(payload, UUID):
        stmt = select(Submission).where(Submission.page_id == payload).order_by(Submission.created_at.asc())
        rows = (await db.execute(stmt)).scalars().all()
        day = datetime.now(UTC).strftime("%Y%m%d")
        safe_slug = "".join(c if c.isalnum() or c in "-_" else "-" for c in p.slug)[:80]
        filename = f"submissions-{safe_slug}-{day}.csv"
        return StreamingResponse(
            iter_submission_csv_rows(rows),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    if kind == "json":
        return JSONResponse(content=payload if isinstance(payload, dict) else {"data": payload})

    raise HTTPException(status_code=500, detail="export_internal")
