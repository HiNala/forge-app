"""Structured intent and assembly plan — Mission 03."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FormField(BaseModel):
    name: str
    label: str
    field_type: Literal["text", "email", "tel", "textarea", "file"] = "text"
    required: bool = False


class SectionPlan(BaseModel):
    component: str = Field(
        ...,
        description="Component template name, e.g. hero-centered, form-vertical",
    )
    props: dict[str, str | list | dict] = Field(default_factory=dict)


class PageIntent(BaseModel):
    page_type: Literal[
        "landing",
        "booking-form",
        "contact-form",
        "proposal",
        "rsvp",
        "menu",
        "custom",
    ] = "custom"
    title_suggestion: str = "Untitled page"
    tone: Literal["warm", "formal", "playful", "serious", "minimal"] = "warm"
    fields: list[FormField] | None = None
    sections: list[str] = Field(
        default_factory=lambda: ["hero-centered", "form-vertical"],
        description="Preferred component ids in order",
    )
    brand_overrides: dict[str, str] | None = None


class AssemblyPlan(BaseModel):
    theme: dict[str, str] = Field(default_factory=dict)
    sections: list[SectionPlan] = Field(default_factory=list)
