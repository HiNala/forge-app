"""FAQ / help page planner — accordion-based Q&A."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_faq(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)

    biz = intent.business_type or intent.title or "this business"
    diffs = intent.key_differentiators

    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="single_column",
            content_brief=(
                f"Minimal hero for {biz} FAQ. Headline: '{intent.headline or 'Frequently Asked Questions'}'. "
                "No image. Clean, centered. Optional search bar placeholder below headline."
            ),
        ),
        SectionSpec(
            id="faq",
            role="content",
            priority=1,
            layout_family="single_column",
            content_brief=(
                f"Accordion FAQ for {biz}. Generate 6–10 realistic Q&A pairs. "
                + (f"Context signals: {'; '.join(diffs[:5])}. " if diffs else "")
                + "Questions should be what a real customer asks before buying/booking. "
                "Answers should be 2–4 sentences: clear, specific, reassuring. "
                "Use accordion_faq component — each item is collapsible. "
                "Group related questions logically (e.g. Pricing, Process, Timeline, Support)."
            ),
        ),
        SectionSpec(
            id="cta",
            role="cta",
            priority=2,
            layout_family="single_column",
            content_brief=(
                f"Still have questions? CTA section for {biz}. "
                "Link to contact/booking form. Button: 'Get in touch' or 'Ask us anything'."
            ),
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=3,
            layout_family="footer_strip",
            content_brief=f"Footer for {biz}.",
        ),
    ]

    hints = {
        "hero": "hero_centered_minimal",
        "faq": "accordion_faq",
        "cta": "cta_button_with_subtext",
        "footer": "footer_minimal",
    }

    return PagePlan(
        workflow="faq",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints={},
    )
