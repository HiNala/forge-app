"""Billing API schemas (Mission 06 / AL-02)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CheckoutBody(BaseModel):
    """Self-serve Stripe Checkout for a paying tier (maps legacy `starter` → free tier checkout is not used)."""

    plan: Literal["starter", "pro", "max_5x", "max_20x"] = Field(
        description="Target plan — `starter` is legacy; prefer `pro` or Max tiers."
    )
    billing_interval: Literal["monthly", "annual"] = "monthly"


class CheckoutOut(BaseModel):
    url: str


class PortalOut(BaseModel):
    url: str


class BillingPlanOut(BaseModel):
    plan: str
    currency: str = "usd"
    status: str | None = None
    trial_ends_at: datetime | None = None
    next_invoice_at: datetime | None = None
    payment_method_last4: str | None = None
    payment_failed_at: datetime | None = None


class BillingUsageOut(BaseModel):
    pages_generated: int
    pages_quota: int
    submissions_received: int
    submissions_quota: int
    tokens_prompt: int
    tokens_completion: int
    period_start: str
    period_end: str
    # V2 P-04 — generation credits (rolling session + week)
    credits_tier: str = "free"
    credits_session_used: int = 0
    credits_session_cap: int = 0
    credits_session_percent: float = 0.0
    credits_week_used: int = 0
    credits_week_cap: int = 0
    credits_week_percent: float = 0.0
    credits_session_resets_at: str | None = None
    credits_week_resets_at: str | None = None
    extra_usage_enabled: bool = False
    extra_usage_monthly_cap_cents: int | None = None
    extra_usage_spent_period_cents: int = 0
    raw: dict[str, Any] = Field(default_factory=dict)


class PlanUpgradeBody(BaseModel):
    plan_slug: str = Field(
        description="One of pro, max_5x, max_20x (canonical slugs)",
        examples=["pro"],
    )
    billing_interval: Literal["monthly", "annual"] = "monthly"


class PlanUpgradeOut(BaseModel):
    mode: Literal["checkout", "subscription_updated"]
    redirect_url: str | None = None
    updated: bool = False
    current_plan: str | None = None
    plan: str | None = Field(
        default=None,
        description="Backward-compatible alias for current_plan after upgrade",
    )
    effective_at: datetime | None = None
    message: str | None = None


class DowngradeBody(BaseModel):
    target_plan_slug: str = Field(
        description="Lower tier to schedule at period end — e.g. free, pro",
    )


class DowngradeScheduleOut(BaseModel):
    scheduled: bool = True
    target_plan: str
    effective_at: datetime


class DowngradeCancelOut(BaseModel):
    cancelled: bool = True


class SubscriptionStateOut(BaseModel):
    cancel_at_period_end: bool | None = None
    current_period_end: datetime | None = None


class ExtraUsageCapBody(BaseModel):
    max_extra_usage_cents_per_month: int | None = Field(
        None,
        description="Cap in cents for billable generation credit overage per Stripe invoice period.",
        ge=0,
        le=500_000,
    )


class ExtraUsageCapOut(BaseModel):
    ok: bool = True
    extra_usage_monthly_cap_cents: int | None
    extra_usage_enabled: bool


class PlanRecommendationOut(BaseModel):
    """Latest non-dismissed plan recommendation row; ``null`` if none."""

    recommendation: dict[str, Any] | None = None


class RecommendationDismissBody(BaseModel):
    recommendation_id: UUID


class RecommendationDismissOut(BaseModel):
    ok: bool = True
