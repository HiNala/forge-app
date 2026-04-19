"""LLM usage accounting → subscription_usage (Mission 03)."""

from __future__ import annotations

import calendar
import logging
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, SubscriptionUsage

logger = logging.getLogger(__name__)


def _month_start(d: date | None = None) -> date:
    today = d or datetime.now(UTC).date()
    return date(today.year, today.month, 1)


def _estimate_cost_cents(model: str, prompt_tokens: int, completion_tokens: int) -> int:
    """Rough blended cost for dashboards (not billing-grade)."""
    m = model.lower()
    # USD per 1M tokens (approximate)
    if "gpt-4o-mini" in m or "haiku" in m or "flash" in m:
        pin, pout = 0.15, 0.60
    elif "gpt-4o" in m or "sonnet" in m:
        pin, pout = 2.50, 10.00
    else:
        pin, pout = 0.50, 2.00
    usd = (prompt_tokens * pin + completion_tokens * pout) / 1_000_000
    return max(0, int(usd * 100))


async def _get_usage_row(
    db: AsyncSession,
    organization_id: UUID,
    period_start: date,
) -> SubscriptionUsage | None:
    return (
        await db.execute(
            select(SubscriptionUsage).where(
                SubscriptionUsage.organization_id == organization_id,
                SubscriptionUsage.period_start == period_start,
            )
        )
    ).scalar_one_or_none()


async def record_llm_usage(
    db: AsyncSession,
    organization_id: UUID,
    *,
    task: str,
    model: str,
    prompt_tokens: int | None,
    completion_tokens: int | None,
    cache_hit: bool = False,
) -> None:
    """Increment token counters and cost for the org's current billing month."""
    del task, cache_hit  # reserved for future line-item logging
    pt = int(prompt_tokens or 0)
    ct = int(completion_tokens or 0)
    if pt == 0 and ct == 0:
        return
    period = _month_start()
    row = await _get_usage_row(db, organization_id, period)
    cost = _estimate_cost_cents(model, pt, ct)
    if row is None:
        row = SubscriptionUsage(
            organization_id=organization_id,
            period_start=period,
            tokens_prompt=pt,
            tokens_completion=ct,
            cost_cents=cost,
        )
        db.add(row)
    else:
        row.tokens_prompt = int(row.tokens_prompt or 0) + pt
        row.tokens_completion = int(row.tokens_completion or 0) + ct
        row.cost_cents = int(row.cost_cents or 0) + cost
    await db.commit()


async def increment_pages_generated(db: AsyncSession, organization_id: UUID) -> None:
    period = _month_start()
    row = await _get_usage_row(db, organization_id, period)
    if row is None:
        row = SubscriptionUsage(
            organization_id=organization_id,
            period_start=period,
            pages_generated=1,
        )
        db.add(row)
    else:
        row.pages_generated = int(row.pages_generated or 0) + 1
    await db.commit()


async def increment_section_edits(db: AsyncSession, organization_id: UUID) -> None:
    period = _month_start()
    row = await _get_usage_row(db, organization_id, period)
    if row is None:
        row = SubscriptionUsage(
            organization_id=organization_id,
            period_start=period,
            section_edits=1,
        )
        db.add(row)
    else:
        row.section_edits = int(row.section_edits or 0) + 1
    await db.commit()


async def assert_page_generation_allowed(db: AsyncSession, organization_id: UUID) -> Organization:
    """Raise 402 if monthly page-generation quota is exceeded."""
    org = await db.get(Organization, organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    plan = (org.plan or "trial").lower()
    limit = (
        settings.PAGE_GENERATION_QUOTA_PRO
        if plan in ("pro", "enterprise")
        else settings.PAGE_GENERATION_QUOTA_TRIAL
    )
    period = _month_start()
    row = await _get_usage_row(db, organization_id, period)
    used = int(row.pages_generated or 0) if row else 0
    if used >= limit:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "quota_exceeded",
                "message": "Monthly page generation quota exceeded for your plan.",
                "upgrade_url": settings.UPGRADE_URL,
            },
        )
    return org


def monthly_quota_for_plan(plan: str) -> int:
    p = (plan or "trial").lower()
    if p in ("pro", "enterprise"):
        return settings.PAGE_GENERATION_QUOTA_PRO
    return settings.PAGE_GENERATION_QUOTA_TRIAL


async def usage_snapshot(db: AsyncSession, organization_id: UUID) -> dict[str, Any]:
    period = _month_start()
    row = await _get_usage_row(db, organization_id, period)
    org = await db.get(Organization, organization_id)
    plan = (org.plan if org else "trial").lower()
    limit = monthly_quota_for_plan(plan)
    used = int(row.pages_generated or 0) if row else 0
    last_day = calendar.monthrange(period.year, period.month)[1]
    period_end = date(period.year, period.month, last_day)
    return {
        "plan": plan,
        "pages_generated": used,
        "pages_quota": limit,
        "period_start": period.isoformat(),
        "period_end": period_end.isoformat(),
        "tokens_prompt": int(row.tokens_prompt or 0) if row else 0,
        "tokens_completion": int(row.tokens_completion or 0) if row else 0,
        "cost_cents": int(row.cost_cents or 0) if row else 0,
    }
