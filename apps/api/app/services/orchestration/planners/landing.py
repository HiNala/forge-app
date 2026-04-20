"""Landing / promotion / gallery — hero → value → proof → CTA."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_landing(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
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
        SectionSpec(
            id="value",
            role="value",
            priority=1,
            layout_family="two_column",
            content_brief="Problem / value proposition in 2–3 sentences.",
        ),
        SectionSpec(
            id="proof",
            role="social_proof",
            priority=2,
            layout_family="card_grid",
            content_brief="Testimonials or logos if available in context.",
        ),
        SectionSpec(
            id="cta",
            role="cta",
            priority=3,
            layout_family="single_column",
            content_brief="Primary call to action.",
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=4,
            layout_family="footer_strip",
            content_brief="Footer strip.",
        ),
    ]
    hints = {
        "hero": "hero-centered",
        "value": "cta-bar",
        "proof": "cta-bar",
        "cta": "cta-bar",
        "footer": "footer-minimal",
    }
    return PagePlan(
        workflow="landing",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints={},
    )
