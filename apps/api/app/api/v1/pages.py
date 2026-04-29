from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import String, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, Page, PageRevision, PageVersion, Submission, User
from app.deps import get_db, require_role, require_tenant
from app.deps.api_scopes import require_api_scopes
from app.deps.auth import require_user
from app.deps.tenant import TenantContext
from app.schemas.page import (
    PageCreate,
    PageDetailOut,
    PageOut,
    PagePatch,
    PageRevisionOut,
    PageVersionOut,
    PublishOut,
)
from app.schemas.submission import SubmissionListOut, SubmissionOut
from app.services.analytics_cache import bust_page_and_org
from app.services.orchestration.html_validate import validate_publishable_html
from app.services.proposal_service import get_or_create_proposal_for_page
from app.services.submissions_csv import iter_submission_csv_rows

logger = logging.getLogger(__name__)

_CACHE_PREFIX = "page:live:"

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("/unread-counts", response_model=dict[str, int])
async def page_unread_counts(
    _scopes: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, int]:
    """Unread = submissions with ``status == 'new'`` per page (Mission FE-05)."""
    stmt = (
        select(Submission.page_id, func.count())
        .where(
            Submission.organization_id == ctx.organization_id,
            Submission.status == "new",
        )
        .group_by(Submission.page_id)
    )
    rows = (await db.execute(stmt)).all()
    return {str(pid): int(cnt) for pid, cnt in rows}


@router.get(
    "",
    response_model=list[PageOut],
)
async def list_pages(
    _: None = Depends(require_api_scopes("read:pages")),
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
    _: None = Depends(require_api_scopes("write:pages")),
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


@router.get(
    "/{page_id}/revisions",
    response_model=list[PageRevisionOut],
)
async def list_page_revisions(
    page_id: UUID,
    _: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> list[PageRevision]:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    rows = (
        await db.execute(
            select(PageRevision)
            .where(PageRevision.page_id == page_id)
            .order_by(PageRevision.created_at.desc())
            .limit(200)
        )
    ).scalars().all()
    return list(rows)


@router.get(
    "/{page_id}",
    response_model=PageDetailOut,
)
async def get_page(
    page_id: UUID,
    _: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> Page:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    return p


@router.patch(
    "/{page_id}",
    response_model=PageOut,
)
async def patch_page(
    page_id: UUID,
    body: PagePatch,
    _: None = Depends(require_api_scopes("write:pages")),
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
    if body.form_schema is not None:
        base = dict(p.form_schema) if isinstance(p.form_schema, dict) else {}
        base.update(body.form_schema)
        p.form_schema = base
    if body.intent_json is not None:
        base_i = dict(p.intent_json) if isinstance(p.intent_json, dict) else {}
        base_i.update(body.intent_json)
        p.intent_json = base_i
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{page_id}")
async def delete_page(
    page_id: UUID,
    _: None = Depends(require_api_scopes("write:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> dict[str, bool]:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(p)
    await db.commit()
    return {"ok": True}


@router.post(
    "/{page_id}/publish",
    response_model=PublishOut,
)
async def publish_page(
    page_id: UUID,
    request: Request,
    _: None = Depends(require_api_scopes("write:pages")),
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
    if p.page_type == "proposal":
        try:
            prop = await get_or_create_proposal_for_page(db, page=p)
            if prop.status == "draft":
                prop.status = "sent"
                prop.sent_at = datetime.now(UTC)
            await db.flush()
        except ValueError:
            pass
    await db.commit()
    await db.refresh(p)

    raw_fs = p.form_schema
    raw_ij = p.intent_json
    payload = {
        "html": ver.html,
        "title": p.title,
        "slug": p.slug,
        "organization_slug": org.slug,
        "page_id": str(p.id),
        "page_type": p.page_type,
        "org_plan": org.plan,
        "form_schema": raw_fs if isinstance(raw_fs, dict) else None,
        "intent_json": raw_ij if isinstance(raw_ij, dict) else None,
    }
    r = getattr(request.app.state, "redis", None)
    if r is not None:
        try:
            await r.set(f"{_CACHE_PREFIX}{org.slug}:{p.slug}", json.dumps(payload))
            await bust_page_and_org(r, page_id=p.id, organization_id=ctx.organization_id)
        except Exception as e:
            logger.warning("publish_cache_write %s", e)

    public_url = f"{settings.APP_PUBLIC_URL.rstrip('/')}/p/{org.slug}/{p.slug}"
    return PublishOut(
        page_id=p.id,
        status=p.status,
        published_version_id=ver.id,
        public_url=public_url,
    )


@router.post(
    "/{page_id}/unpublish",
)
async def unpublish_page(
    page_id: UUID,
    request: Request,
    _: None = Depends(require_api_scopes("write:pages")),
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


@router.get(
    "/{page_id}/versions",
    response_model=list[PageVersionOut],
)
async def list_versions(
    page_id: UUID,
    _: None = Depends(require_api_scopes("read:pages")),
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


@router.post(
    "/{page_id}/revert/{version_id}",
    response_model=PageOut,
)
async def revert_page(
    page_id: UUID,
    version_id: UUID,
    _: None = Depends(require_api_scopes("write:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Page:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    ver = await db.get(PageVersion, version_id)
    if ver is None or ver.page_id != page_id:
        raise HTTPException(status_code=404, detail="Version not found")
    p.current_html = ver.html
    if ver.form_schema is not None:
        p.form_schema = ver.form_schema
    await db.commit()
    await db.refresh(p)
    return p


@router.post(
    "/{page_id}/duplicate",
    response_model=PageOut,
)
async def duplicate_page(
    page_id: UUID,
    _: None = Depends(require_api_scopes("write:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Page:
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    base_slug = f"{p.slug}-copy"
    candidate = base_slug
    counter = 1
    while True:
        existing = (
            await db.execute(
                select(Page).where(
                    Page.organization_id == ctx.organization_id,
                    Page.slug == candidate,
                )
            )
        ).scalar_one_or_none()
        if existing is None:
            break
        counter += 1
        candidate = f"{base_slug}-{counter}"
    new_page = Page(
        organization_id=ctx.organization_id,
        slug=candidate,
        page_type=p.page_type,
        title=f"{p.title} (Copy)",
        current_html=p.current_html or "",
        form_schema=p.form_schema,
        brand_kit_snapshot=p.brand_kit_snapshot,
        intent_json=p.intent_json,
    )
    db.add(new_page)
    await db.commit()
    await db.refresh(new_page)
    return new_page


@router.get(
    "/{page_id}/submissions",
    response_model=SubmissionListOut,
)
async def list_page_submissions(
    page_id: UUID,
    _: None = Depends(require_api_scopes("read:submissions")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(
        None,
        description="Return submissions created strictly before this timestamp (cursor, ISO 8601).",
    ),
    status: str | None = Query(None, description="Filter: new | read | replied | archived"),
    q: str | None = Query(None, description="Case-insensitive search across payload JSON text"),
) -> SubmissionListOut:
    """List submissions (newest first). Paginate using ``before`` from prior ``next_before``."""
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    stmt = select(Submission).where(Submission.page_id == page_id)
    if status:
        stmt = stmt.where(Submission.status == status)
    if q and q.strip():
        stmt = stmt.where(cast(Submission.payload, String).ilike(f"%{q.strip()}%"))
    if before is not None:
        stmt = stmt.where(Submission.created_at < before)
    stmt = stmt.order_by(Submission.created_at.desc()).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    items = [SubmissionOut.model_validate(r) for r in rows]
    next_before = rows[-1].created_at if len(rows) == limit else None
    return SubmissionListOut(items=items, next_before=next_before)


@router.get(
    "/{page_id}/submissions/export",
)
async def export_submissions_csv(
    page_id: UUID,
    _: None = Depends(require_api_scopes("read:submissions")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    status: str | None = Query(None, description="Filter: new | read | replied | archived"),
    q: str | None = Query(None, description="Case-insensitive search across payload JSON text"),
) -> StreamingResponse:
    """Download submissions for this page as CSV (oldest first), mirroring list filters."""
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    stmt = select(Submission).where(Submission.page_id == page_id)
    if status:
        stmt = stmt.where(Submission.status == status)
    if q and q.strip():
        stmt = stmt.where(cast(Submission.payload, String).ilike(f"%{q.strip()}%"))
    stmt = stmt.order_by(Submission.created_at.asc())
    rows = (await db.execute(stmt)).scalars().all()
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


@router.get("/{page_id}/export/html")
async def export_page_html(
    page_id: UUID,
    _: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> StreamingResponse:
    """Download the page's current HTML as a self-contained file."""
    p = await db.get(Page, page_id)
    if p is None or p.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    html = p.current_html or ""
    if not html.strip():
        raise HTTPException(status_code=404, detail="Page has no generated content yet")
    safe_slug = "".join(c if c.isalnum() or c in "-_" else "-" for c in (p.slug or "page"))[:80]
    filename = f"{safe_slug}.html"

    async def _stream() -> AsyncIterator[bytes]:
        yield html.encode("utf-8")

    return StreamingResponse(
        _stream(),
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
