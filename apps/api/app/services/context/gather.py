"""Parallel context gathering for Studio (Mission O-01)."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BrandKit, CalendarConnection, Organization, Page, User
from app.services.context.budget import wait_with_budget, with_timeout
from app.services.context.models import (
    CalendarSummary,
    ContextBundle,
    PageSummary,
    SiteBrand,
    VoiceProfile,
)
from app.services.context.site_extract import (
    extract_site_brand,
    extract_site_products_stub,
    extract_site_voice_stub,
)
from app.services.context.urls import domain_from_email, extract_urls_from_prompt

logger = logging.getLogger(__name__)


async def _load_brand_kit(db: AsyncSession, org_id: UUID) -> dict[str, Any] | None:
    row = (await db.execute(select(BrandKit).where(BrandKit.organization_id == org_id))).scalar_one_or_none()
    if row is None:
        return None
    return {
        "primary_color": row.primary_color,
        "secondary_color": row.secondary_color,
        "display_font": row.display_font,
        "body_font": row.body_font,
        "voice_note": row.voice_note,
    }


async def _load_recent_pages(db: AsyncSession, org_id: UUID, limit: int = 5) -> list[PageSummary]:
    rows = (
        (
            await db.execute(
                select(Page).where(Page.organization_id == org_id).order_by(Page.updated_at.desc()).limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [PageSummary(id=str(p.id), title=p.title or "Untitled", page_type=p.page_type) for p in rows]


async def _load_org_templates(_db: AsyncSession, _org_id: UUID) -> list[Any]:
    return []


async def _load_user_voice(user: User) -> dict[str, Any] | None:
    prefs = user.user_preferences or {}
    vp = prefs.get("voice_profile")
    if isinstance(vp, dict) and vp.get("persona_summary"):
        return vp
    return None


async def _load_calendars_summary(db: AsyncSession, org_id: UUID) -> list[CalendarSummary]:
    rows = (
        (await db.execute(select(CalendarConnection).where(CalendarConnection.organization_id == org_id).limit(10)))
        .scalars()
        .all()
    )
    out: list[CalendarSummary] = []
    for r in rows:
        label = getattr(r, "calendar_name", None) or getattr(r, "calendar_id", None) or "Calendar"
        out.append(CalendarSummary(label=str(label)[:80], connected=True, detail=None))
    if not out:
        out.append(CalendarSummary(label="No calendars connected", connected=False))
    return out


async def _resolve_urls(
    prompt: str,
    org: Organization,
    user: User,
) -> list[str]:
    urls = extract_urls_from_prompt(prompt)
    if urls:
        return urls
    settings = org.org_settings or {}
    wu = settings.get("website_url")
    if isinstance(wu, str) and wu.startswith("http"):
        return [wu]
    dom = domain_from_email(user.email)
    if dom and dom not in ("gmail.com", "outlook.com", "yahoo.com", "hotmail.com"):
        return [f"https://{dom}"]
    return []


async def gather_context(
    *,
    db: AsyncSession,
    org: Organization,
    user: User,
    prompt: str,
    time_budget_seconds: float = 3.0,
) -> ContextBundle:
    """Parallel gather with hard budget; secondary URL tasks get an additional slice."""
    t0 = time.perf_counter()
    incomplete: list[str] = []

    async def brand_task() -> dict[str, Any] | None:
        r = await with_timeout(_load_brand_kit(db, org.id), 1.5, "brand_kit")
        if r is None:
            return None
        return r if isinstance(r, dict) else None

    async def urls_task() -> list[str]:
        return await _resolve_urls(prompt, org, user)

    async def recent_task() -> list[PageSummary]:
        return await with_timeout(_load_recent_pages(db, org.id), 1.2, "recent_pages") or []

    async def tpl_task() -> list[Any]:
        r = await with_timeout(_load_org_templates(db, org.id), 0.8, "org_templates")
        return r if isinstance(r, list) else []

    async def voice_task() -> dict[str, Any] | None:
        r = await with_timeout(_load_user_voice(user), 0.5, "user_voice")
        if r is None:
            return None
        return r if isinstance(r, dict) else None

    async def cal_task() -> list[CalendarSummary]:
        return await with_timeout(_load_calendars_summary(db, org.id), 1.5, "calendars") or []

    tasks = {
        "brand_kit": asyncio.create_task(brand_task()),
        "prompt_urls": asyncio.create_task(urls_task()),
        "recent_pages": asyncio.create_task(recent_task()),
        "org_templates": asyncio.create_task(tpl_task()),
        "user_voice": asyncio.create_task(voice_task()),
        "calendars": asyncio.create_task(cal_task()),
    }

    primary = await wait_with_budget(tasks, budget_seconds=time_budget_seconds)

    bundle = ContextBundle(
        brand_kit=primary.get("brand_kit"),
        prompt_urls=list(primary.get("prompt_urls") or []),
        recent_pages=list(primary.get("recent_pages") or []),
        org_templates=list(primary.get("org_templates") or []),
        user_voice=None,
        calendars=list(primary.get("calendars") or []),
    )
    uv = primary.get("user_voice")
    if isinstance(uv, dict):
        try:
            bundle.user_voice = VoiceProfile.model_validate(uv)
        except Exception:
            bundle.user_voice = VoiceProfile(persona_summary=str(uv.get("persona_summary", ""))[:400])

    urls = bundle.prompt_urls
    if urls:
        url = urls[0]
        sub_tasks = {
            "site_brand": asyncio.create_task(with_timeout(extract_site_brand(url), 2.0, "site_brand")),
            "site_voice": asyncio.create_task(with_timeout(extract_site_voice_stub(url), 2.0, "site_voice")),
            "site_products": asyncio.create_task(
                with_timeout(extract_site_products_stub(url), 2.0, "site_products"),
            ),
        }
        sub = await wait_with_budget(sub_tasks, budget_seconds=2.0)
        if isinstance(sub.get("site_brand"), SiteBrand):
            bundle.site_brand = sub["site_brand"]
        elif sub.get("site_brand") is None:
            incomplete.append("site_brand")
        sv = sub.get("site_voice")
        if sv is not None:
            bundle.site_voice = sv
        if sub.get("site_products"):
            bundle.site_products = list(sub["site_products"])

    bundle.gather_duration_ms = int((time.perf_counter() - t0) * 1000)
    bundle.gather_incomplete = sorted(set(incomplete))
    return bundle
