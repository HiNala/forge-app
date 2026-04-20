"""Event RSVP — hero → form (guests + dietary) → footer."""

from __future__ import annotations

from typing import Any

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_rsvp(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    fl: list[dict[str, Any]]
    if intent.fields:
        fl = [
            {"name": f.name, "label": f.label, "type": f.field_type, "required": f.required}
            for f in intent.fields
        ]
    else:
        fl = [
            {"name": "name", "label": "Name", "type": "text", "required": True},
            {"name": "email", "label": "Email", "type": "email", "required": True},
            {"name": "guests", "label": "Number of guests", "type": "text", "required": False},
        ]
    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=intent.headline or f"RSVP — {intent.title_suggestion}",
        ),
        SectionSpec(
            id="form",
            role="form",
            priority=1,
            layout_family="single_column",
            content_brief="RSVP form",
            required_data=["form_fields"],
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=2,
            layout_family="footer_strip",
            content_brief="Footer",
        ),
    ]
    return PagePlan(
        workflow="event_rsvp",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints={"hero": "hero-centered", "form": "form-vertical", "footer": "footer-minimal"},
        data_hints={"form_fields": fl},
    )
