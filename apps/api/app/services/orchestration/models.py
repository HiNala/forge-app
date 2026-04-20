"""Structured intent, assembly plan — Mission 03 + O-02."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.services.orchestration.planning_models import WorkflowPlanType

PageType = Literal[
    "landing",
    "booking-form",
    "contact-form",
    "proposal",
    "pitch_deck",
    "rsvp",
    "menu",
    "custom",
]

WorkflowType = WorkflowPlanType

VisualDirection = Literal["warm", "minimal", "bold", "playful", "formal"]

WORKFLOW_TO_PAGE_TYPE: dict[WorkflowType, PageType] = {
    "contact_form": "contact-form",
    "proposal": "proposal",
    "pitch_deck": "pitch_deck",
    "landing": "landing",
    "menu": "menu",
    "event_rsvp": "rsvp",
    "gallery": "custom",
    "promotion": "landing",
    "other": "custom",
}

# booking-form shares contact_form planner
PAGE_TYPE_TO_WORKFLOW: dict[PageType, WorkflowType] = {
    "landing": "landing",
    "booking-form": "contact_form",
    "contact-form": "contact_form",
    "proposal": "proposal",
    "pitch_deck": "pitch_deck",
    "rsvp": "event_rsvp",
    "menu": "menu",
    "custom": "other",
}


class FormField(BaseModel):
    name: str = Field(..., description="Snake_case field name for form posts")
    label: str = Field(..., description="Human label shown next to the input")
    field_type: Literal["text", "email", "tel", "textarea", "file"] = Field(
        default="text",
        description="Input control type",
    )
    required: bool = Field(default=False, description="Whether the field is required")


class AlternativeInterpretation(BaseModel):
    workflow: WorkflowType = Field(..., description="Alternative workflow the prompt might mean")
    confidence: float = Field(..., ge=0, le=1, description="Relative weight vs primary workflow")


class Assumption(BaseModel):
    field: str = Field(..., description="Which logical field was assumed")
    value: str = Field(..., description="Value used")
    reason: str = Field(..., description="Why this default was chosen")


class BookingIntent(BaseModel):
    """Parsed from prompts mentioning scheduling; drives form_schema.forge_booking + slot picker."""

    enabled: bool = Field(default=False, description="True when user wants appointments / time slots")
    calendar_id: str | None = Field(
        default=None,
        description="Optional availability_calendar UUID when the user named a specific calendar",
    )
    duration_minutes: int | None = Field(
        default=None,
        ge=5,
        le=240,
        description="Appointment length in minutes when specified",
    )
    calendar_preference: str | None = Field(
        default=None,
        description="Free-text calendar or slot style hint for Studio copy",
    )


class ProposalIntent(BaseModel):
    client_hint: str | None = Field(default=None, description="Client or job name if mentioned")
    project_hint: str | None = Field(default=None, description="Scope or location hint")


class DeckIntent(BaseModel):
    narrative_framework: str | None = Field(
        default=None,
        description="Preferred deck framework key when ambiguous",
    )


class MenuIntent(BaseModel):
    sections_hint: list[str] = Field(
        default_factory=list,
        description="Menu section names if mentioned (e.g. Lunch, Drinks)",
    )


class SectionPlan(BaseModel):
    component: str = Field(
        ...,
        description="Component template name, e.g. hero-centered, form-vertical",
    )
    props: dict[str, Any] = Field(default_factory=dict)


class PageIntent(BaseModel):
    """Structured parse of what the user wants to build (O-02)."""

    workflow: WorkflowType = Field(
        default="other",
        description=(
            "High-level workflow: contact_form, proposal, pitch_deck, landing, menu, "
            "event_rsvp, gallery, promotion, other"
        ),
    )
    page_type: PageType = Field(
        default="custom",
        description="Forge page_type stored on pages — must align with workflow when possible",
    )
    confidence: float = Field(
        default=0.85,
        ge=0,
        le=1,
        description="Parser confidence in workflow + fields",
    )

    title: str = Field(default="", description="Human title for the page")
    headline: str = Field(default="", description="Primary hero headline")
    subheadline: str | None = Field(default=None, description="Supporting hero line")
    title_suggestion: str = Field(
        default="Untitled page",
        description="Short title (legacy field; kept for JSON round-trips)",
    )

    tone: Literal["warm", "formal", "playful", "serious", "minimal"] = Field(
        default="warm",
        description="Overall tone for copy",
    )
    visual_direction: VisualDirection = Field(
        default="warm",
        description="Visual mood: warm, minimal, bold, playful, formal",
    )
    density: Literal["sparse", "balanced", "dense"] = Field(
        default="balanced",
        description="Information density on the page",
    )

    deck_kind: str | None = Field(default=None, description="Pitch deck kind key (W-03)")
    deck_narrative_framework: str | None = Field(
        default=None,
        description="Narrative framework key for decks",
    )

    fields: list[FormField] = Field(
        default_factory=list,
        description="Form fields for contact, booking, RSVP pages",
    )
    sections: list[str] = Field(
        default_factory=lambda: ["hero-centered", "form-vertical"],
        description="Preferred component ids in order (legacy / override)",
    )
    brand_overrides: dict[str, str] | None = Field(
        default=None,
        description="Optional brand color overrides",
    )

    booking: BookingIntent | None = Field(default=None, description="Booking-specific intent")
    proposal: ProposalIntent | None = Field(default=None, description="Proposal-specific intent")
    deck: DeckIntent | None = Field(default=None, description="Deck-specific intent")
    menu: MenuIntent | None = Field(default=None, description="Menu-specific intent")

    alternatives: list[AlternativeInterpretation] = Field(
        default_factory=list,
        description="Other plausible workflows for clarify UX",
    )
    assumptions: list[Assumption] = Field(
        default_factory=list,
        description="Fields we assumed — show as 'I assumed…' in Studio",
    )

    @model_validator(mode="before")
    @classmethod
    def _normalize(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if d.get("fields") is None:
            d["fields"] = []
        ts = str(d.get("title_suggestion") or "").strip()
        t = str(d.get("title") or "").strip()
        if t and not ts:
            d["title_suggestion"] = t
        elif ts and not t:
            d["title"] = ts
        if not d.get("title") and not d.get("title_suggestion"):
            d["title"] = "Untitled page"
            d["title_suggestion"] = "Untitled page"
        hl = str(d.get("headline") or "").strip()
        if not hl:
            d["headline"] = str(d.get("title") or d.get("title_suggestion") or "Untitled page").strip()
        wf = d.get("workflow", "other")
        if wf != "other":
            d["page_type"] = WORKFLOW_TO_PAGE_TYPE.get(wf, d.get("page_type", "custom"))
        return d


class AssemblyPlan(BaseModel):
    theme: dict[str, str] = Field(default_factory=dict)
    sections: list[SectionPlan] = Field(default_factory=list)
