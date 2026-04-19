"""Central quota checks — Mission 06."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, SubscriptionUsage
from app.services.billing_plans import (
    allows_custom_domain,
    monthly_page_generation_limit,
    monthly_submissions_limit,
)


def _month_start(d: date | None = None) -> date:
    today = d or datetime.now(UTC).date()
    return date(today.year, today.month, 1)


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

QuotaMetric = Literal["pages_generated", "submissions", "custom_domain"]


def _upgrade_url() -> str:
    return settings.UPGRADE_URL.rstrip("/")


def quota_exceeded_response(
    *,
    metric: str,
    current: int,
    limit: int,
) -> HTTPException:
    return HTTPException(
        status_code=402,
        detail={
            "code": "quota_exceeded",
            "metric": metric,
            "current": current,
            "limit": limit,
            "upgrade_url": _upgrade_url(),
        },
    )


async def check_quota(
    db: AsyncSession,
    org: Organization,
    metric: QuotaMetric,
) -> None:
    """Raise 402 when the org is at or over plan limits for ``metric``."""
    period = _month_start()
    row = await _get_usage_row(db, org.id, period)
    trial_ends = org.trial_ends_at

    if metric == "pages_generated":
        limit = monthly_page_generation_limit(org.plan, trial_ends_at=trial_ends)
        used = int(row.pages_generated or 0) if row else 0
        if used >= limit:
            raise quota_exceeded_response(metric="pages_generated", current=used, limit=limit)
        return

    if metric == "submissions":
        limit = monthly_submissions_limit(org.plan, trial_ends_at=trial_ends)
        used = int(row.submissions_received or 0) if row else 0
        if used >= limit:
            raise quota_exceeded_response(metric="submissions", current=used, limit=limit)
        return

    if metric == "custom_domain":
        if not allows_custom_domain(org.plan, trial_ends_at=trial_ends):
            raise quota_exceeded_response(metric="custom_domain", current=1, limit=0)
        return
