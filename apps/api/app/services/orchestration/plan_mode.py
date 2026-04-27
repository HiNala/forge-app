"""Multi-step plan mode (V2 P-05) — editable plans before execution."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PlanStep(BaseModel):
    id: str
    title: str
    estimated_credits: int = 0
    kind: str = "compose"  # compose | refine | deck | site


class PlanDraft(BaseModel):
    """User- or parser-generated plan; executed stepwise when approved."""

    steps: list[PlanStep] = Field(default_factory=list)
    total_credits_estimate: int = 0
