"""Canonical plan slugs and ordering for billing (AL-02 / V2-P04)."""

from __future__ import annotations

from typing import Literal

from app.config import settings
from app.services.billing.plans import plan_for_credit_tier

# Higher number = paid tier dominance for upgrade/downgrade UX
PLAN_RANK: dict[str, int] = {
    "trial": 0,
    "free": 0,
    "starter": 0,  # legacy alias of free
    "pro": 1,
    "max_5x": 2,
    "enterprise": 3,
    "max_20x": 3,
}

SELF_SERVE_PAYING: tuple[str, ...] = ("pro", "max_5x", "max_20x")

BillingInterval = Literal["monthly", "annual"]


def normalize_plan_slug(plan: str | None) -> str:
    """Single place for legacy → modern slugs."""
    p = (plan or "").strip().lower()
    if p == "starter":
        return "free"
    if p == "enterprise":
        return "max_20x"
    return p


def plan_rank(plan: str | None) -> int:
    return PLAN_RANK.get(normalize_plan_slug(plan or ""), 0)


def is_upgrade(from_plan: str | None, to_plan: str) -> bool:
    return plan_rank(to_plan) > plan_rank(from_plan)


def is_downgrade(from_plan: str | None, to_plan: str) -> bool:
    return plan_rank(to_plan) < plan_rank(from_plan)


def concurrency_cap_for_plan(plan: str | None) -> int:
    """Simultaneous heavy Studio jobs per org (V2-P04)."""
    p = normalize_plan_slug(plan or "")
    if p in ("trial", "starter", "free"):
        return plan_for_credit_tier("free").concurrent_generations
    if p == "pro":
        return plan_for_credit_tier("pro").concurrent_generations
    if p == "max_5x":
        return plan_for_credit_tier("max_5x").concurrent_generations
    if p in ("enterprise", "max_20x"):
        return plan_for_credit_tier("max_20x").concurrent_generations
    return plan_for_credit_tier("free").concurrent_generations


def stripe_price_id_for_plan(plan_slug: str, interval: BillingInterval) -> str:
    """Resolve configured Stripe price id (empty string if unconfigured)."""
    p = normalize_plan_slug(plan_slug)
    if p == "pro":
        return (
            settings.STRIPE_PRICE_PRO_ANNUAL.strip()
            if interval == "annual"
            else settings.STRIPE_PRICE_PRO.strip()
        )
    if p == "max_5x":
        return (
            settings.STRIPE_PRICE_MAX_5X_ANNUAL.strip()
            if interval == "annual"
            else settings.STRIPE_PRICE_MAX_5X_MONTHLY.strip()
        )
    if p == "max_20x":
        return (
            settings.STRIPE_PRICE_MAX_20X_ANNUAL.strip()
            if interval == "annual"
            else settings.STRIPE_PRICE_MAX_20X_MONTHLY.strip()
        )
    return ""


def plan_slug_from_stripe_price_id(price_id: str | None) -> str | None:
    """Map a configured recurring price id back to GlideDesign plan slug (webhook reconcile)."""
    if not price_id:
        return None
    pid = price_id.strip()
    mapping = [
        (settings.STRIPE_PRICE_PRO.strip(), "pro"),
        (settings.STRIPE_PRICE_PRO_ANNUAL.strip(), "pro"),
        (settings.STRIPE_PRICE_MAX_5X_MONTHLY.strip(), "max_5x"),
        (settings.STRIPE_PRICE_MAX_5X_ANNUAL.strip(), "max_5x"),
        (settings.STRIPE_PRICE_MAX_20X_MONTHLY.strip(), "max_20x"),
        (settings.STRIPE_PRICE_MAX_20X_ANNUAL.strip(), "max_20x"),
    ]
    for val, slug in mapping:
        if val and pid == val:
            return slug
    return None
