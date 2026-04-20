"""Component tree JSON — LLM describes structure; templates render HTML (Mission O-03)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, Field


class ComponentNode(BaseModel):
    """One component instance in the page tree."""

    name: str = Field(..., description="Catalog component id, e.g. hero_split, form_stacked")
    props: dict[str, Any] = Field(default_factory=dict, description="Typed props for the template")
    section_id: str = Field(
        default="section",
        description="Stable id for data-forge-section and analytics",
        validation_alias=AliasChoices("data-forge-section", "section_id"),
    )
    children: list[ComponentNode] = Field(
        default_factory=list,
        description="Nested components (forms with fields, accordions, etc.)",
    )

    model_config = {"populate_by_name": True}


class ComponentTree(BaseModel):
    """Root output from composer agents — rendered to HTML by the template engine."""

    page_title: str = Field(default="", description="Document title / og:title")
    meta_description: str | None = Field(default=None, description="Meta description")
    og_image_hint: str | None = Field(default=None, description="Optional image URL or hint")
    components: list[ComponentNode] = Field(default_factory=list, description="Top-level sections in order")
    workflow: str | None = Field(default=None, description="Workflow hint for validation")
    density: Literal["sparse", "balanced", "dense"] | None = Field(default=None)


class SlideOutline(BaseModel):
    """Deck outline stage — one row per slide slot."""

    title: str = ""
    takeaway: str = ""
    layout_hint: str = "bullet_list"
    data_hints: dict[str, Any] = Field(default_factory=dict)
    image_hint: str | None = None
    speaker_note_hint: str | None = None


class DeckOutline(BaseModel):
    """Strategic deck outline before per-slide expansion."""

    framework_name: str = ""
    slides: list[SlideOutline] = Field(default_factory=list)


class ProposalLineItem(BaseModel):
    description: str = ""
    qty: float = 1.0
    rate_cents: int = 0
    category: str = "Other"


class ProposalComponentTree(ComponentTree):
    """Proposal workflow — strongly typed pricing for server-side math."""

    proposal_number: str | None = None
    client_name: str | None = None
    project_name: str | None = None
    expiration_iso: str | None = None
    tax_rate_bps: int = 0
    line_items: list[ProposalLineItem] = Field(default_factory=list)
    subtotal_cents: int | None = None
    total_cents: int | None = None
