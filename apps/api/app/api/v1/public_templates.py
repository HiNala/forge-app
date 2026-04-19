"""Unauthenticated template previews for marketing /examples/{slug}."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Template
from app.deps.db import get_db_public
from app.schemas.template import PublicTemplateOut, TemplateSlugListOut

router = APIRouter(prefix="/public/templates", tags=["public-templates"])


@router.get("/slugs", response_model=TemplateSlugListOut)
async def list_published_slugs(
    db: AsyncSession = Depends(get_db_public),
) -> TemplateSlugListOut:
    rows = (
        await db.execute(
            select(Template.slug)
            .where(Template.is_published.is_(True))
            .order_by(Template.sort_order.asc(), Template.slug.asc())
        )
    ).all()
    return TemplateSlugListOut(slugs=[r[0] for r in rows])


@router.get("/by-slug/{slug}", response_model=PublicTemplateOut)
async def get_public_template_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db_public),
) -> PublicTemplateOut:
    row = (
        await db.execute(
            select(Template).where(
                Template.slug == slug,
                Template.is_published.is_(True),
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return PublicTemplateOut(
        id=row.id,
        slug=row.slug,
        name=row.name,
        description=row.description,
        category=row.category,
        preview_image_url=row.preview_image_url,
        html=row.html,
    )
