"""Shared Pydantic types for the review subsystem."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["suggestion", "minor", "major", "critical"]


class Finding(BaseModel):
    expert: str
    severity: Severity | str
    section_ref: str | None = None
    dimension: str
    message: str
    specific_quote: str | None = None
    suggested_action: str
    auto_fixable: bool = False
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class ReviewReport(BaseModel):
    findings: list[Finding] = Field(default_factory=list)
    overall_quality_score: int = Field(default=88, ge=0, le=100)
    summary: str = ""


class VoiceDriftResult(BaseModel):
    voice_score: int = Field(default=90, ge=0, le=100)
    drift_examples: list[str] = Field(default_factory=list)
    summary: str = ""
