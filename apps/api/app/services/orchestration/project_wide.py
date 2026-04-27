"""Project-wide transforms — fan-out + consent (V2 P-05)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProjectWideConsent(BaseModel):
    target_screens: int
    estimated_credits: int
    message: str = Field(
        default="This will modify multiple screens. Continue?",
    )
