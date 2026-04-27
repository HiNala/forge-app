"""Structured clarify events (V2 P-05) — extends O-02 workflow clarify."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ClarifyKind = Literal[
    "workflow",
    "scope",
    "breakpoint",
    "reference",
]


class ClarifyCandidate(BaseModel):
    key: str
    label: str
    workflow: str | None = None
    confidence: float | None = None
    thumbnail_url: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class ClarifyPayload(BaseModel):
    """Payload for SSE event `clarify` — non-blocking; user may ignore."""

    kind: ClarifyKind = "workflow"
    message: str | None = None
    candidates: list[ClarifyCandidate] = Field(default_factory=list)
    dismiss_after_seconds: int = 12
