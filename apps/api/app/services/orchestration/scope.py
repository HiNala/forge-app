"""Scope hierarchy and composer protocol (V2 P-05 — canvas-aware orchestration)."""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Protocol, TypedDict, runtime_checkable
from uuid import UUID

from pydantic import BaseModel, Field


class ScopeLevel(StrEnum):
    """Granularity of an orchestration / compose operation."""

    REGION = "region"  # marquee within a screen / page
    ELEMENT = "element"  # single component
    SECTION = "section"  # named block (e.g. data-forge-section)
    SCREEN = "screen"  # one mobile screen or one web page
    FLOW = "flow"  # multi-screen or multi-page
    PROJECT = "project"  # site-wide / rate-limited fan-out


class BoundingBox(TypedDict, total=False):
    x: float
    y: float
    w: float
    h: float
    page_width: float
    page_height: float
    platform: str


class Scope(BaseModel):
    """Concrete bounds for a compose run — all fields optional; validate per ScopeLevel."""

    level: ScopeLevel
    page_id: UUID | None = None
    screen_id: str | None = None
    section_id: str | None = None
    element_id: str | None = None
    region: BoundingBox | None = None
    screen_ids: list[str] = Field(default_factory=list)
    project_id: str | None = None
    max_parallel: int = Field(default=20, ge=1, le=20)


class ComposeResult(BaseModel):
    """Uniform output for scoped composers (HTML, tree, or patch)."""

    html: str | None = None
    tree: dict[str, Any] | None = None
    unscoped_drift: bool = False
    notes: str = ""


@runtime_checkable
class ScopedComposer(Protocol):
    """Workflow composers implement this interface (gradual migration from BaseComposer)."""

    workflow_key: str

    async def compose(
        self,
        scope: Scope,
        prompt: str,
        *,
        context: Any,  # ContextBundle in production
    ) -> ComposeResult: ...


# --- Reference-style generation (P-05) ---
REFERENCE_SAFEGUARD = (
    "Do not reproduce third-party trademarks, logos, or proprietary text. "
    "Use the reference only for layout, hierarchy, and mood; adapt to the user's brand and voice."
)
