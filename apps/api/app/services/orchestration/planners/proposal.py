"""Proposal — cover → summary → scope → line items → timeline → terms → acceptance."""

from __future__ import annotations

from typing import Any

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_proposal(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    client = ""
    if intent.proposal and intent.proposal.client_hint:
        client = intent.proposal.client_hint
    elif bundle and bundle.site_brand and bundle.site_brand.business_name:
        client = bundle.site_brand.business_name

    scope_brief = (
        f"Scope of work for {client or 'the client'} — pull from user prompt and "
        "intent; avoid inventing numbers unless in context."
    )
    data: dict[str, Any] = {"client_hint": client}
    if bundle and bundle.site_products:
        data["products"] = [p.name for p in bundle.site_products[:12]]

    sections: list[SectionSpec] = [
        SectionSpec(
            id="cover",
            role="cover",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=f"Cover title: {intent.title or intent.title_suggestion}; formal tone.",
        ),
        SectionSpec(
            id="executive_summary",
            role="summary",
            priority=1,
            layout_family="single_column",
            content_brief="2–3 sentence executive summary of the engagement.",
        ),
        SectionSpec(
            id="scope",
            role="scope",
            priority=2,
            layout_family="single_column",
            content_brief=scope_brief,
        ),
        SectionSpec(
            id="line_items",
            role="pricing",
            priority=3,
            layout_family="card_grid",
            content_brief="Line items table placeholder — materials, labor, fees.",
        ),
        SectionSpec(
            id="timeline",
            role="timeline",
            priority=4,
            layout_family="single_column",
            content_brief="Delivery timeline or milestones.",
        ),
        SectionSpec(
            id="terms",
            role="terms",
            priority=5,
            layout_family="single_column",
            content_brief="Terms, assumptions, disclaimers (non-legal boilerplate).",
        ),
        SectionSpec(
            id="acceptance",
            role="acceptance",
            priority=6,
            layout_family="two_column",
            content_brief="Accept / decline actions for the proposal.",
        ),
    ]
    hints = {
        "cover": "hero-centered",
        "executive_summary": "hero-centered",
        "scope": "hero-centered",
        "line_items": "footer-minimal",
        "timeline": "cta-bar",
        "terms": "footer-minimal",
        "acceptance": "proposal-accept-decline",
    }
    return PagePlan(
        workflow="proposal",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints=data,
    )
