from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, Page, PageVersion, Submission, User
from app.deps import get_db, require_role, require_tenant
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse
from app.schemas.page import (
    PageCreate,
    PageDetailOut,
    PageOut,
    PagePatch,
    PageVersionOut,
    PublishOut,
)
from app.schemas.submission import SubmissionListOut, SubmissionOut
from app.services.orchestration.html_validate import validate_publishable_html
from app.services.submissions_csv import iter_submission_csv_rows

logger = logging.getLogger(__name__)

_CACHE_PREFIX = "page:live:"

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("", response_model=list[PageOut])
async def list_pages(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> list[Page]:
    rows = (
        await db.execute(select(Page).where(Page.organization_id == ctx.organization_id))
    ).scalars().all()
    return list(rows)


@router.post("", response_model=PageOut)
async def create_page(
    body: PageCreate,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Page:
    exists = (
        await db.execute(
            select(Page).where(
                Page.organization_id == ctx.organization_id,
                Page.slug == body.slug,
            )
        )
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Slug already used in this organization")
    p = Page(
        organization_id=ctx.organization_id,
        slug=body.slug,
        page_type=body.page_type,
        title=body.title,
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("/{page_id}", response_model=PageDetailOut)
async def get_page(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> Page:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    return p


@router.patch("/{page_id}", response_model=PageOut)
async def patch_page(
    page_id: UUID,
    body: PagePatch,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Page:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    if body.title is not None:
        p.title = body.title
    if body.slug is not None:
        p.slug = body.slug
    if body.status is not None:
        p.status = body.status
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{page_id}")
async def delete_page(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> dict[str, bool]:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(p)
    await db.commit()
    return {"ok": True}


@router.post("/{page_id}/publish", response_model=PublishOut)
async def publish_page(
    page_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> PublishOut:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    ok, reason = validate_publishable_html(p.current_html or "")
    if not ok:
        raise HTTPException(status_code=400, detail=reason)

    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    max_ver = (
        await db.execute(
            select(func.coalesce(func.max(PageVersion.version_number), 0)).where(
                PageVersion.page_id == p.id
            )
        )
    ).scalar_one()
    vn = int(max_ver) + 1

    ver = PageVersion(
        page_id=p.id,
        organization_id=ctx.organization_id,
        version_number=vn,
        html=p.current_html or "",
        form_schema=p.form_schema,
        brand_kit_snapshot=p.brand_kit_snapshot,
        published_by_user_id=user.id,
    )
    db.add(ver)
    await db.flush()
    p.published_version_id = ver.id
    p.status = "live"
    await db.commit()
    await db.refresh(p)

    payload = {
        "html": ver.html,
        "title": p.title,
        "slug": p.slug,
        "organization_slug": org.slug,
    }
    r = getattr(request.app.state, "redis", None)
    if r is not None:
        try:
            await r.set(f"{_CACHE_PREFIX}{org.slug}:{p.slug}", json.dumps(payload))
        except Exception as e:
            logger.warning("publish_cache_write %s", e)

    public_url = f"{settings.APP_PUBLIC_URL.rstrip('/')}/p/{org.slug}/{p.slug}"
    return PublishOut(
        page_id=p.id,
        status=p.status,
        published_version_id=ver.id,
        public_url=public_url,
    )


@router.post("/{page_id}/unpublish")
async def unpublish_page(
    page_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> dict[str, bool | str]:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    p.status = "draft"
    await db.commit()

    r = getattr(request.app.state, "redis", None)
    if r is not None:
        try:
            await r.delete(f"{_CACHE_PREFIX}{org.slug}:{p.slug}")
        except Exception as e:
            logger.warning("unpublish_cache_delete %s", e)

    return {"ok": True, "status": "draft"}


@router.get("/{page_id}/versions", response_model=list[PageVersionOut])
async def list_versions(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> list[PageVersion]:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    rows = (
        await db.execute(
            select(PageVersion)
            .where(PageVersion.page_id == page_id)
            .order_by(PageVersion.version_number.desc())
        )
    ).scalars().all()
    return list(rows)


@router.post("/{page_id}/revert/{version_id}", response_model=StubResponse)
async def revert_page(
    page_id: UUID,
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.post("/{page_id}/duplicate", response_model=StubResponse)
async def duplicate_page(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/{page_id}/submissions", response_model=SubmissionListOut)
async def list_page_submissions(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(
        None,
        description="Return submissions created strictly before this timestamp (cursor, ISO 8601).",
    ),
) -> SubmissionListOut:
    """List submissions (newest first). Paginate using ``before`` from prior ``next_before``."""
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    stmt = select(Submission).where(Submission.page_id == page_id)
    if before is not None:
        stmt = stmt.where(Submission.created_at < before)
    stmt = stmt.order_by(Submission.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    items = [SubmissionOut.model_validate(r) for r in rows]
    next_before = rows[-1].created_at if len(rows) == limit else None
    return SubmissionListOut(items=items, next_before=next_before)


@router.get("/{page_id}/submissions/export")
async def export_submissions_csv(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> StreamingResponse:
    """Download all submissions for this page as CSV (oldest first)."""
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    rows = (
        await db.execute(
            select(Submission)
            .where(Submission.page_id == page_id)
            .order_by(Submission.created_at.asc())
        )
    ).scalars().all()
    day = datetime.now(UTC).strftime("%Y%m%d")
    safe_slug = "".join(c if c.isalnum() or c in "-_" else "-" for c in p.slug)[:80]
    filename = f"submissions-{safe_slug}-{day}.csv"
    return StreamingResponse(
        iter_submission_csv_rows(rows),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
