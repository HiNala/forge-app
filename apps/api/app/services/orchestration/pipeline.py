"""Studio generation pipeline — SSE-friendly orchestration."""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BrandKit, Organization, Page, PageRevision, User
from app.deps.tenant import TenantContext
from app.services.ai.usage import increment_pages_generated
from app.services.orchestration.html_validate import validate_generated_html
from app.services.orchestration.intent_parser import compose_assembly_plan, parse_intent
from app.services.orchestration.models import PageIntent
from app.services.orchestration.page_composer import (
    apply_plan_constraints,
    assemble_html,
    default_assembly_plan,
    render_section,
)
from app.utils.slug import slugify_page_title, unique_page_slug

logger = logging.getLogger(__name__)


def _sse(event: str, payload: dict[str, Any]) -> bytes:
    return f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n".encode()


async def stream_page_generation(
    *,
    db: AsyncSession,
    ctx: TenantContext,
    user: User,
    prompt: str,
    provider: str | None,
    existing_page_id: UUID | None,
) -> AsyncIterator[bytes]:
    """Yield SSE chunks: intent → html.chunk (per section) → html.complete | error."""
    brand_row = (
        await db.execute(select(BrandKit).where(BrandKit.organization_id == ctx.organization_id))
    ).scalar_one_or_none()
    brand_hint: dict[str, Any] | None = None
    brand_snapshot: dict[str, Any] | None = None
    primary = "#2563EB"
    secondary = "#0F172A"
    if brand_row:
        brand_hint = {
            "primary_color": brand_row.primary_color,
            "secondary_color": brand_row.secondary_color,
            "voice_note": brand_row.voice_note,
        }
        brand_snapshot = {
            "primary_color": brand_row.primary_color,
            "secondary_color": brand_row.secondary_color,
            "display_font": brand_row.display_font,
            "body_font": brand_row.body_font,
            "voice_note": brand_row.voice_note,
        }
        if brand_row.primary_color:
            primary = brand_row.primary_color
        if brand_row.secondary_color:
            secondary = brand_row.secondary_color

    try:
        intent = await parse_intent(
            prompt,
            brand_hint=brand_hint,
            provider=provider,
            db=db,
            organization_id=ctx.organization_id,
        )
    except Exception as e:
        logger.exception("intent_fatal %s", e)
        intent = PageIntent(title_suggestion=prompt[:80] or "Page")

    yield _sse("intent", {"intent": intent.model_dump(mode="json")})
    yield _sse("html.start", {"status": "composing"})

    title = intent.title_suggestion or "Untitled"
    existing: Page | None = None
    if existing_page_id is not None:
        ep = await db.get(Page, existing_page_id)
        if ep is None or ep.organization_id != ctx.organization_id:
            yield _sse("error", {"code": "not_found", "message": "Page not found"})
            return
        existing = ep
        slug = ep.slug
        title = intent.title_suggestion or ep.title or title
    else:
        base_slug = slugify_page_title(title)
        slug = await unique_page_slug(db, ctx.organization_id, base_slug)

    org_row = await db.get(Organization, ctx.organization_id)
    if org_row is None:
        yield _sse("error", {"code": "not_found", "message": "Organization not found"})
        return
    org_slug = org_row.slug
    form_action = f"/p/{org_slug}/{slug}/submit"

    plan = await compose_assembly_plan(
        intent,
        provider=provider,
        db=db,
        organization_id=ctx.organization_id,
    )
    plan = apply_plan_constraints(intent, plan)

    for i, sec in enumerate(plan.sections):
        sid = f"{sec.component}-{i}"
        frag = render_section(sec, form_action=form_action, section_id=sid)
        yield _sse("html.chunk", {"index": i, "component": sec.component, "fragment": frag})

    html = assemble_html(
        plan,
        title=title,
        org_slug=org_slug,
        page_slug=slug,
        primary=primary,
        secondary=secondary,
    )

    ok, reason = validate_generated_html(html)
    if not ok:
        logger.warning("html_validate_retry %s", reason)
        plan2 = apply_plan_constraints(intent, default_assembly_plan(intent))
        for i, sec in enumerate(plan2.sections):
            sid = f"{sec.component}-{i}"
            frag = render_section(sec, form_action=form_action, section_id=sid)
            payload = {"index": i, "component": sec.component, "fragment": frag, "retry": True}
            yield _sse("html.chunk", payload)
        html = assemble_html(
            plan2,
            title=title,
            org_slug=org_slug,
            page_slug=slug,
            primary=primary,
            secondary=secondary,
        )
        ok2, _ = validate_generated_html(html)
        if not ok2:
            yield _sse("error", {"code": "validation_failed", "message": reason})
            return

    form_schema: dict[str, Any] | None = None
    if intent.fields:
        form_schema = {
            "fields": [
                {
                    "name": f.name,
                    "label": f.label,
                    "type": f.field_type,
                    "required": f.required,
                }
                for f in intent.fields
            ]
        }

    if existing is not None:
        page = existing
        page.title = title
        page.page_type = intent.page_type
        page.current_html = html
        page.form_schema = form_schema
        page.intent_json = intent.model_dump(mode="json")
        page.brand_kit_snapshot = brand_snapshot
        db.add(
            PageRevision(
                page_id=page.id,
                organization_id=ctx.organization_id,
                html=html,
                edit_type="refine",
                user_prompt=prompt[:2000],
                tokens_used=None,
                llm_provider=None,
                llm_model=None,
            )
        )
        await db.commit()
        await db.refresh(page)
        pid = page.id
    else:
        page = Page(
            organization_id=ctx.organization_id,
            slug=slug,
            page_type=intent.page_type,
            title=title,
            current_html=html,
            form_schema=form_schema,
            intent_json=intent.model_dump(mode="json"),
            brand_kit_snapshot=brand_snapshot,
            created_by_user_id=user.id,
        )
        db.add(page)
        await db.flush()
        pid = page.id
        db.add(
            PageRevision(
                page_id=pid,
                organization_id=ctx.organization_id,
                html=html,
                edit_type="generate",
                user_prompt=prompt[:2000],
                tokens_used=None,
                llm_provider=None,
                llm_model=None,
            )
        )
        await db.commit()
        await db.refresh(page)
        await increment_pages_generated(db, ctx.organization_id)

    yield _sse(
        "html.complete",
        {
            "page_id": str(pid),
            "slug": slug,
            "title": title,
        },
    )
