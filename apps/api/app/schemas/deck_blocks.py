"""Structured slide payload for pitch decks (W-03) — persisted in decks.slides JSONB."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class QuoteBlock(BaseModel):
    text: str
    attribution: str | None = None


class ChartBlock(BaseModel):
    chart_type: Literal["bar", "line", "area", "pie"] = "bar"
    title: str | None = None
    labels: list[str] = Field(default_factory=list)
    series: list[dict[str, Any]] = Field(default_factory=list)
    is_placeholder: bool = True
    source_hint: str | None = None


class ImageBlock(BaseModel):
    prompt: str | None = None
    url: str | None = None
    alt: str | None = None


class TeamMember(BaseModel):
    name: str
    role: str | None = None
    bio: str | None = None
    image_url: str | None = None


class MetricBlock(BaseModel):
    label: str
    value: str
    sublabel: str | None = None


SlideLayout = Literal[
    "title_cover",
    "section_header",
    "single_takeaway",
    "two_column",
    "three_column",
    "four_quadrant",
    "big_number",
    "bullet_list",
    "chart",
    "image_full",
    "image_with_caption",
    "quote",
    "team_grid",
    "timeline",
    "comparison_table",
    "process_flow",
    "closing",
]


class Slide(BaseModel):
    id: str
    order: int
    layout: SlideLayout
    title: str | None = None
    subtitle: str | None = None
    body: str | None = None
    bullets: list[str] = Field(default_factory=list)
    quote: QuoteBlock | None = None
    chart: ChartBlock | None = None
    image: ImageBlock | None = None
    team_members: list[TeamMember] = Field(default_factory=list)
    metrics: list[MetricBlock] = Field(default_factory=list)
    footer: str | None = None
    speaker_notes: str | None = None
    background_color: str | None = None
    accent_color: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
