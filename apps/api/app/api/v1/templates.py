"""Curated template library — browse and clone into the active org."""

from __future__ import annotations

import secrets
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AnalyticsEvent,
    BrandKit,
    Conversation,
    Message,
    Organization,
    Page,
    PageRevision,
    Template,
    User,
)
from app.deps import get_db_user_only, require_role
from app.deps.auth import require_user
from app.deps.db import get_db
from app.deps.tenant import TenantContext
from app.schemas.template import (
    TemplateDetailOut,
    TemplateListItemOut,
    UseTemplateOut,
)
from app.services.product_analytics import capture
from app.services.template_finalize import (
    brand_kit_snapshot_dict,
    finalize_template_html,
)

router = APIRouter(prefix="/templates", tags=["templates"])


def _default_colors(kit: BrandKit | None) -> tuple[str, str]:
    if kit is None:
        return "#2563EB", "#64748B"
    p = (kit.primary_color or "").strip() or "#2563EB"
    s = (kit.secondary_color or "").strip() or "#64748B"
    return p, s


async def _unique_page_slug(db: AsyncSession, organization_id: UUID, base: str) -> str:
    stem = base[:60].strip("-") or "page"
    for _ in range(12):
        cand = f"{stem}-{secrets.token_hex(2)}"
        exists = (
            await db.execute(
                select(Page.id).where(
                    Page.organization_id == organization_id,
                    Page.slug == cand,
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            return cand
    return f"{stem}-{secrets.token_hex(4)}"


@router.get("", response_model=list[TemplateListItemOut])
async def list_templates(
    category: str | None = None,
    q: str | None = Query(None, description="Search name/description"),
    from_tool: str | None = Query(
        None,
        description="Only templates listing this slug in intent_json.migrate_from (P-08).",
    ),
    db: AsyncSession = Depends(get_db_user_only),
    _user: User = Depends(require_user),
) -> list[TemplateListItemOut]:
    stmt = select(Template).where(Template.is_published.is_(True))
    if category:
        stmt = stmt.where(Template.category == category)
    if q and q.strip():
        pat = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Template.name.ilike(pat), Template.description.ilike(pat)),
        )
    stmt = stmt.order_by(Template.sort_order.asc(), Template.name.asc())
    rows = (await db.execute(stmt)).scalars().all()
    if from_tool and from_tool.strip():
        ft = from_tool.strip().lower()
        rows = [
            r
            for r in rows
            if isinstance(r.intent_json, dict)
            and ft in [str(x).lower() for x in (r.intent_json.get("migrate_from") or []) if x]
        ]
    return [TemplateListItemOut.from_template_row(r) for r in rows]


@router.get("/{template_id}", response_model=TemplateDetailOut)
async def get_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db_user_only),
    _user: User = Depends(require_user),
) -> Template:
    row = (
        await db.execute(
            select(Template).where(
                Template.id == template_id,
                Template.is_published.is_(True),
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return row


@router.post("/{template_id}/use", response_model=UseTemplateOut)
async def use_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
    user: User = Depends(require_user),
) -> UseTemplateOut:
    t = (
        await db.execute(
            select(Template).where(
                Template.id == template_id,
                Template.is_published.is_(True),
            )
        )
    ).scalar_one_or_none()
    if t is None:
        raise HTTPException(status_code=404, detail="Template not found")

    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    kit = (
        await db.execute(select(BrandKit).where(BrandKit.organization_id == ctx.organization_id))
    ).scalar_one_or_none()
    primary, secondary = _default_colors(kit)

    page_slug = await _unique_page_slug(db, ctx.organization_id, t.slug)
    title = t.name
    html = finalize_template_html(
        t.html,
        org_slug=org.slug,
        page_slug=page_slug,
        title=title,
        primary=primary,
        secondary=secondary,
    )

    intent = dict(t.intent_json or {})
    intent["template_id"] = str(t.id)
    intent["template_name"] = t.name
    intent["template_slug"] = t.slug

    snap = brand_kit_snapshot_dict(
        primary=primary,
        secondary=secondary,
        logo_url=kit.logo_url if kit else None,
        display_font=kit.display_font if kit else None,
        body_font=kit.body_font if kit else None,
    )

    page_type = str(intent.get("page_type") or "landing")

    page = Page(
        organization_id=ctx.organization_id,
        slug=page_slug,
        page_type=page_type,
        title=title,
        status="draft",
        current_html=html,
        form_schema=t.form_schema,
        brand_kit_snapshot=snap,
        intent_json=intent,
        created_by_user_id=user.id,
    )
    db.add(page)
    await db.flush()

    db.add(
        PageRevision(
            page_id=page.id,
            organization_id=ctx.organization_id,
            html=html,
            edit_type="template_applied",
            user_prompt=f"Template: {t.name}",
        )
    )

    conv = Conversation(page_id=page.id, organization_id=ctx.organization_id)
    db.add(conv)
    await db.flush()

    welcome = (
        f"Started from the *{t.name}* template. What would you like to change?"
    )
    db.add(
        Message(
            conversation_id=conv.id,
            organization_id=ctx.organization_id,
            role="assistant",
            content=welcome,
        )
    )

    ev = AnalyticsEvent(
        organization_id=ctx.organization_id,
        page_id=page.id,
        event_type="template_use_click",
        visitor_id=f"user:{user.id}",
        session_id=uuid.uuid4().hex,
        metadata_={
            "template_id": str(t.id),
            "template_slug": t.slug,
            "template_name": t.name,
        },
    )
    db.add(ev)

    await db.commit()
    await db.refresh(page)

    await capture(
        str(user.id),
        "template_use_click",
        {
            "template_id": str(t.id),
            "organization_id": str(ctx.organization_id),
        },
    )

    return UseTemplateOut(
        page_id=page.id,
        studio_path=f"/studio?pageId={page.id}",
    )
