"""Coming soon / waitlist — countdown + email capture + optional social proof."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_coming_soon(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    product = intent.business_type or intent.title or "this launch"
    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=(
                f"Pre-launch hero for {product}. Name + one-line why it matters. "
                "Mention a launch window or “notify me” promise — countdown text if no fixed date."
            ),
        ),
        SectionSpec(
            id="capture",
            role="form",
            priority=1,
            layout_family="single_column",
            content_brief="Slim email capture: single field + 'Notify me' CTA, trust line below.",
        ),
        SectionSpec(
            id="teaser",
            role="value",
            priority=2,
            layout_family="card_grid",
            content_brief="3 short bullets: what is shipping, who it is for, why now.",
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=3,
            layout_family="footer_strip",
            content_brief="Minimal legal / social links.",
        ),
    ]
    return PagePlan(
        workflow="coming_soon",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
    )

