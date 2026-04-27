"""Billing API schemas (Mission 06)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class CheckoutBody(BaseModel):
    plan: Literal["starter", "pro"] = Field(description="Self-serve plan to purchase")


class CheckoutOut(BaseModel):
    url: str


class PortalOut(BaseModel):
    url: str


class BillingPlanOut(BaseModel):
    plan: str
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
    # V2 P-04 — Forge Credits (rolling session + week)
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
