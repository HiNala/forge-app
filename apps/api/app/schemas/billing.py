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
    raw: dict[str, Any] = Field(default_factory=dict)
