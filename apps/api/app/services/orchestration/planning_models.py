"""Deterministic page plans — Mission O-02 (planner output before assembly)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.services.context.models import VoiceProfile


class BrandTokens(BaseModel):
    """Resolved brand tokens passed to the composer."""

    primary: str = Field(default="#2563EB", description="Primary brand color hex")
    secondary: str = Field(default="#0F172A", description="Secondary / accent hex")
    display_font: str | None = None
    body_font: str | None = None
    radius_px: int = Field(default=8, ge=0, le=48)
    spacing_scale: Literal["tight", "normal", "relaxed"] = "normal"


class SectionSpec(BaseModel):
    """One composable section in render order."""

    id: str = Field(..., description="Stable id, e.g. hero, form, trust_signals")
    role: str = Field(..., description="Semantic role for the composer")
    priority: int = Field(default=0, description="Lower renders earlier")
    layout_family: str = Field(
        ...,
        description="Layout hint: full_bleed_hero | two_column | card_grid | single_column | footer_strip",
    )
    content_brief: str = Field(
        ...,
        description="1–2 sentences: what this section must communicate",
    )
    min_words: int = 0
    max_words: int = 200
    required_data: list[str] = Field(
        default_factory=list,
        description="Keys the composer must satisfy, e.g. form_fields, calendar_slots",
    )


WorkflowPlanType = Literal[
    "contact_form",
    "proposal",
    "pitch_deck",
    "landing",
    "menu",
    "event_rsvp",
    "gallery",
    "promotion",
    "portfolio",
    "link_in_bio",
    "waitlist",
    "faq",
    "survey",
    "quiz",
    "coming_soon",
    "resume",
    "mobile_app",
    "website",
    "other",
]


class PagePlan(BaseModel):
    """Blueprint the template composer executes."""

    workflow: WorkflowPlanType
    sections: list[SectionSpec] = Field(default_factory=list)
    brand_tokens: BrandTokens = Field(default_factory=BrandTokens)
    voice_profile: VoiceProfile = Field(default_factory=VoiceProfile)
    component_hints: dict[str, str] = Field(
        default_factory=dict,
        description="Per section id → layout/component hint for assembly",
    )
    data_hints: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured data (form fields, products, calendar summary strings)",
    )
