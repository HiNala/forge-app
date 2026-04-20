"""Fallback planner — simple hero + optional form + footer."""

from __future__ import annotations

from typing import Any

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_default(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=intent.headline or intent.title_suggestion,
        ),
    ]
    data: dict[str, Any] = {}
    hints: dict[str, str] = {"hero": "hero-centered"}
    if intent.fields:
        sections.append(
            SectionSpec(
                id="form",
                role="form",
                priority=1,
                layout_family="single_column",
                content_brief="Form block",
                required_data=["form_fields"],
            ),
        )
        hints["form"] = "form-vertical"
        data["form_fields"] = [
            {"name": f.name, "label": f.label, "type": f.field_type, "required": f.required}
            for f in intent.fields
        ]
    sections.append(
        SectionSpec(
            id="footer",
            role="footer",
            priority=9,
            layout_family="footer_strip",
            content_brief="Footer",
        ),
    )
    hints["footer"] = "footer-minimal"
    return PagePlan(
        workflow="other",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints=data,
    )
