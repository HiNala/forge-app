from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BrandKit, Organization, User
from app.deps import get_db, require_role, require_tenant
from app.deps.auth import require_user
from app.deps.db import get_db_user_only
from app.deps.tenant import TenantContext
from app.schemas.org import (
    BrandKitOut,
    BrandKitPut,
    CreateWorkspaceBody,
    LogoUploadResponse,
    OrganizationOut,
    OrganizationPatch,
)
from app.services.bootstrap import create_additional_workspace
from app.services.brand_validate import is_valid_color
from app.services.storage_s3 import guess_ext, upload_brand_logo

router = APIRouter(prefix="/org", tags=["organization"])

_ALLOWED_CT = frozenset(
    {"image/png", "image/jpeg", "image/svg+xml", "image/webp"},
)


@router.post("/workspaces", response_model=OrganizationOut)
async def create_workspace(
    body: CreateWorkspaceBody,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db_user_only),
) -> Organization:
    """Create an additional workspace (owner); used by the app-shell workspace switcher."""
    org = await create_additional_workspace(
        db, user_id=user.id, workspace_name=body.name
    )
    await db.commit()
    await db.refresh(org)
    return org


@router.get("", response_model=OrganizationOut)
async def get_org(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> Organization:
    org = await db.get(Organization, ctx.organization_id)
    if org is None or org.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("", response_model=OrganizationOut)
async def patch_org(
    body: OrganizationPatch,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Organization:
    org = await db.get(Organization, ctx.organization_id)
    if org is None or org.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Organization not found")
    if body.name is not None:
        org.name = body.name
    if body.slug is not None:
        exists = (
            await db.execute(
                select(Organization).where(
                    Organization.slug == body.slug,
                    Organization.id != org.id,
                )
            )
        ).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=409, detail="Slug already taken")
        org.slug = body.slug
    await db.commit()
    await db.refresh(org)
    return org


@router.delete("", response_model=OrganizationOut)
async def delete_org(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> Organization:
    org = await db.get(Organization, ctx.organization_id)
    if org is None or org.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Organization not found")
    now = datetime.now(UTC)
    org.deleted_at = now
    org.scheduled_purge_at = now + timedelta(days=30)
    await db.commit()
    await db.refresh(org)
    return org


@router.get("/brand", response_model=BrandKitOut)
async def get_brand(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> BrandKit:
    bk = (
        await db.execute(select(BrandKit).where(BrandKit.organization_id == ctx.organization_id))
    ).scalar_one_or_none()
    if bk is None:
        bk = BrandKit(organization_id=ctx.organization_id)
        db.add(bk)
        await db.commit()
        await db.refresh(bk)
    return bk


@router.put("/brand", response_model=BrandKitOut)
async def put_brand(
    body: BrandKitPut,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> BrandKit:
    if not is_valid_color(body.primary_color) or not is_valid_color(body.secondary_color):
        raise HTTPException(status_code=422, detail="Invalid color format (use hex or oklch)")
    bk = (
        await db.execute(select(BrandKit).where(BrandKit.organization_id == ctx.organization_id))
    ).scalar_one_or_none()
    if bk is None:
        bk = BrandKit(organization_id=ctx.organization_id)
        db.add(bk)
        await db.flush()
    for field in ("primary_color", "secondary_color", "display_font", "body_font", "voice_note"):
        val = getattr(body, field)
        if val is not None:
            setattr(bk, field, val)
    await db.commit()
    await db.refresh(bk)
    return bk


@router.post("/brand/logo", response_model=LogoUploadResponse)
async def post_brand_logo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> LogoUploadResponse:
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct not in _ALLOWED_CT:
        raise HTTPException(status_code=422, detail="Allowed types: PNG, JPEG, SVG, WebP")
    raw = await file.read()
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="File too large (max 2MB)")
    ext = guess_ext(file.filename or "logo", ct)
    if ext == "bin":
        raise HTTPException(status_code=422, detail="Could not determine file extension")
    url = upload_brand_logo(
        organization_id=ctx.organization_id,
        content=raw,
        content_type=ct,
        ext=ext,
    )
    bk = (
        await db.execute(select(BrandKit).where(BrandKit.organization_id == ctx.organization_id))
    ).scalar_one_or_none()
    if bk is None:
        bk = BrandKit(organization_id=ctx.organization_id, logo_url=url)
        db.add(bk)
    else:
        bk.logo_url = url
    await db.commit()
    return LogoUploadResponse(logo_url=url)


@router.get("/notifications/unread-count")
async def notifications_unread_count(
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, int]:
    """Stub until automation failure notifications ship (F05)."""
    del ctx  # tenant resolved; RLS-ready for future query
    return {"count": 0}
