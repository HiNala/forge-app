"""Rolling session (5h) and week (7d) windows for Forge Credits (P-04)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Organization

SESSION = timedelta(hours=5)
WEEK = timedelta(days=7)


def _utcnow() -> datetime:
    return datetime.now(UTC)


def apply_rolling_resets_in_memory(org: Organization, *, now: datetime | None = None) -> None:
    """
    Update org counters when windows expire. Mutates `org` in place; caller persists.
    """
    n = now or _utcnow()
    if org.session_window_start is None or n - org.session_window_start >= SESSION:
        org.credits_consumed_session = 0
        org.session_window_start = n
    if org.week_window_start is None or n - org.week_window_start >= WEEK:
        org.credits_consumed_week = 0
        org.week_window_start = n


async def ensure_windows(db: AsyncSession, organization_id, *, now: datetime | None = None) -> None:
    """Load org, apply window resets, flush (caller commits)."""
    org = (await db.execute(select(Organization).where(Organization.id == organization_id))).scalar_one_or_none()
    if org is None:
        return
    apply_rolling_resets_in_memory(org, now=now)
    await db.flush()
