"""BP-02 feedback submission."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class FeedbackSubmitIn(BaseModel):
    run_id: UUID
    artifact_kind: Literal["screen", "slide", "page", "code_file", "reasoning", "suggestion"]
    artifact_ref: str = Field(min_length=1, max_length=512)
    sentiment: Literal["positive", "negative", "improvement_request"]
    structured_reasons: list[str] = Field(default_factory=list)
    free_text: str | None = Field(default=None, max_length=4000)
    action_taken: str | None = Field(default=None, max_length=120)
    preceded_refine_run_id: UUID | None = None


class FeedbackSubmitOut(BaseModel):
    id: UUID
    memory_writes: list[dict[str, Any]] = Field(default_factory=list)
