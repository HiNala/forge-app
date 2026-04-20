"""Contact / booking form — hero → intro → form → trust → footer."""

from __future__ import annotations

from typing import Any

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def _form_fields(intent: PageIntent) -> list[dict[str, Any]]:
    if intent.fields:
        return [
            {
                "name": f.name,
                "label": f.label,
                "type": f.field_type,
                "required": f.required,
            }
            for f in intent.fields
        ]
    return [
        {"name": "name", "label": "Name", "type": "text", "required": True},
        {"name": "email", "label": "Email", "type": "email", "required": True},
    ]


def plan_contact_form(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    fl = _form_fields(intent)
    calendar_note = ""
    if bundle and bundle.calendars:
        calendar_note = " ".join(
            f"{c.label}: {c.detail or 'connected'}" for c in bundle.calendars[:3]
        )
    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=((intent.headline or intent.title) + " — " + (intent.subheadline or "")).strip(),
        ),
        SectionSpec(
            id="intro",
            role="intro",
            priority=1,
            layout_family="single_column",
            content_brief="Brief intro inviting the visitor to reach out; keep it short.",
        ),
        SectionSpec(
            id="form",
            role="form",
            priority=2,
            layout_family="single_column",
            content_brief="Lead capture form with the fields requested in the intent.",
            required_data=["form_fields"] + (["calendar_slots"] if calendar_note else []),
        ),
        SectionSpec(
            id="trust_signals",
            role="trust",
            priority=3,
            layout_family="card_grid",
            content_brief="Trust line or testimonial placeholder if no proof in context.",
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=4,
            layout_family="footer_strip",
            content_brief="Minimal footer with org name.",
        ),
    ]
    hints = {
        "hero": "hero-centered",
        "intro": "hero-centered",
        "form": "form-vertical",
        "trust_signals": "cta-bar",
        "footer": "footer-minimal",
    }
    data: dict[str, Any] = {"form_fields": fl}
    if calendar_note:
        data["calendar_summary"] = calendar_note
    return PagePlan(
        workflow="contact_form",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints=data,
    )
