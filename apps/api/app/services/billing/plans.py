"""Canonical commercial plan definitions (AL-02 / V2-P04).

Used for credit caps, concurrency, resource entitlements documentation, and marketing alignment.
Stripe price IDs stay in ``settings`` and ``pricing_catalog.stripe_price_id_for_plan``.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Plan:
    slug: str
    display_name: str
    # Rolling GlideDesign generation credits (see ``credit_windows``: session ≈ 5h, week ≈ 7d)
    session_credits_cap: int
    week_credits_cap: int
    concurrent_generations: int
    monthly_published_pages_cap: int
    custom_domain: bool
    export_formats: tuple[str, ...]
    analytics_retention_days: int
    seats_cap: int
    made_with_forge_badge: bool


# Source of truth aligned with docs/V2_P04_* — tweak numbers in one place.
PLANS: dict[str, Plan] = {
    "free": Plan(
        slug="free",
        display_name="Free",
        session_credits_cap=100,
        week_credits_cap=100,
        concurrent_generations=1,
        monthly_published_pages_cap=3,
        custom_domain=False,
        export_formats=("html_static", "embed_iframe"),
        analytics_retention_days=30,
        seats_cap=1,
        made_with_forge_badge=True,
    ),
    "pro": Plan(
        slug="pro",
        display_name="Pro",
        session_credits_cap=500,
        week_credits_cap=2500,
        concurrent_generations=3,
        monthly_published_pages_cap=-1,
        custom_domain=True,
        export_formats=("html_static", "embed_iframe", "pptx", "pdf"),
        analytics_retention_days=180,
        seats_cap=10,
        made_with_forge_badge=False,
    ),
    "max_5x": Plan(
        slug="max_5x",
        display_name="Max",
        session_credits_cap=2500,
        week_credits_cap=10_000,
        concurrent_generations=8,
        monthly_published_pages_cap=-1,
        custom_domain=True,
        export_formats=("html_static", "embed_iframe", "pptx", "pdf"),
        analytics_retention_days=365,
        seats_cap=50,
        made_with_forge_badge=False,
    ),
    "max_20x": Plan(
        slug="max_20x",
        display_name="Max Enterprise",
        session_credits_cap=10_000,
        week_credits_cap=100_000,
        concurrent_generations=20,
        monthly_published_pages_cap=-1,
        custom_domain=True,
        export_formats=("html_static", "embed_iframe", "pptx", "pdf"),
        analytics_retention_days=365,
        seats_cap=500,
        made_with_forge_badge=False,
    ),
}


def plan_for_credit_tier(tier: str) -> Plan:
    """tier is credits.py tier: free | pro | max_5x | max_20x."""
    return PLANS.get(tier, PLANS["free"])

