from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Page
from app.deps import get_db, require_role, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse
from app.schemas.page import PageCreate, PageDetailOut, PageOut, PagePatch

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


@router.post("/{page_id}/publish", response_model=StubResponse)
async def publish_page(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.post("/{page_id}/unpublish", response_model=StubResponse)
async def unpublish_page(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/{page_id}/versions", response_model=StubResponse)
async def list_versions(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


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


@router.get("/{page_id}/submissions", response_model=StubResponse)
async def list_page_submissions(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/{page_id}/submissions/export", response_model=StubResponse)
async def export_submissions_csv(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()
