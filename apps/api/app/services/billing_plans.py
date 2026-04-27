"""Plan limits — Mission 06 (Starter / Pro / Enterprise + trial)."""

from __future__ import annotations

from datetime import UTC, datetime

from app.config import settings


def trial_is_active(*, trial_ends_at: datetime | None) -> bool:
    if trial_ends_at is None:
        return False
    return trial_ends_at > datetime.now(UTC)


def _trial_active(*, trial_ends_at: datetime | None) -> bool:
    return trial_is_active(trial_ends_at=trial_ends_at)


def effective_plan(plan: str | None, *, trial_ends_at: datetime | None) -> str:
    """Enterprise stays enterprise; active trial maps to Pro-equivalent limits."""
    p = (plan or "trial").lower()
    if p == "enterprise":
        return "enterprise"
    if _trial_active(trial_ends_at=trial_ends_at):
        return "pro"
    return p


def monthly_page_generation_limit(plan: str | None, *, trial_ends_at: datetime | None) -> int:
    p = effective_plan(plan, trial_ends_at=trial_ends_at)
    if p == "enterprise":
        return settings.PAGE_GENERATION_QUOTA_PRO
    if p == "pro":
        return settings.PAGE_GENERATION_LIMIT_PRO
    if p == "starter":
        return settings.PAGE_GENERATION_LIMIT_STARTER
    return settings.PAGE_GENERATION_QUOTA_TRIAL


def monthly_submissions_limit(plan: str | None, *, trial_ends_at: datetime | None) -> int:
    p = effective_plan(plan, trial_ends_at=trial_ends_at)
    if p == "enterprise":
        return settings.SUBMISSIONS_LIMIT_PRO * 10
    if p == "pro":
        return settings.SUBMISSIONS_LIMIT_PRO
    if p == "starter":
        return settings.SUBMISSIONS_LIMIT_STARTER
    return min(settings.SUBMISSIONS_LIMIT_STARTER, settings.PAGE_GENERATION_QUOTA_TRIAL)


def team_seat_limit(plan: str | None, *, trial_ends_at: datetime | None) -> int:
    p = effective_plan(plan, trial_ends_at=trial_ends_at)
    if p == "enterprise":
        return 1000
    if p == "pro":
        return 10
    if p == "starter":
        return 1
    return 3


def analytics_retention_days(plan: str | None, *, trial_ends_at: datetime | None) -> int:
    p = effective_plan(plan, trial_ends_at=trial_ends_at)
    if p == "enterprise":
        return 365
    if p == "pro":
        return 180
    return 90


def allows_custom_domain(plan: str | None, *, trial_ends_at: datetime | None) -> bool:
    p = effective_plan(plan, trial_ends_at=trial_ends_at)
    return p in ("pro", "enterprise")
