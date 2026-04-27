"""Waitlist / coming-soon planner — pre-launch email capture."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_waitlist(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)

    product = intent.business_type or intent.title or "this product"
    action = intent.primary_action or "join the waitlist"
    diffs = intent.key_differentiators
    customer = intent.target_customer or "early adopters"
    diff_str = (" Key benefits: " + "; ".join(diffs[:4]) + ".") if diffs else ""

    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="single_column",
            content_brief=(
                f"Launch hero for {product}. Headline: '{intent.headline or intent.title_suggestion}'. "
                f"Subheadline: '{intent.subheadline or ''}'. "
                f"Immediately below the headline: an inline email capture form (single email field + CTA button). "
                f"Button label: 'Join the Waitlist' or similar; CTA should match “{action}”. {diff_str}"
                "Visual direction: bold. This should feel like an exciting launch, not a static page."
            ),
        ),
        SectionSpec(
            id="benefits",
            role="value",
            priority=1,
            layout_family="card_grid",
            content_brief=(
                f"3 benefit cards explaining what {customer} get when they join. "
                f"For {product}: {diff_str} "
                "Use short punchy card titles (≤6 words) + 1-sentence description. "
                "Use bullet_block or numbered_steps."
            ),
        ),
        SectionSpec(
            id="social_proof",
            role="social_proof",
            priority=2,
            layout_family="single_column",
            content_brief=(
                "Social proof bar. Options in order of preference: "
                "(1) If a count was mentioned (e.g. '500 people signed up'), show that as a stat. "
                "(2) Show a rating_line with '⭐ Already loved by early testers'. "
                "(3) A single short quote from an early tester. "
                "If nothing credible exists, skip this section."
            ),
        ),
        SectionSpec(
            id="cta",
            role="cta",
            priority=3,
            layout_family="single_column",
            content_brief=(
                "Bottom CTA repeating the email capture form. "
                "Headline: urgency-focused (e.g. 'Spots are limited — don't miss launch'). "
                "Same email + button as hero, so it's easy to sign up after scrolling."
            ),
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=4,
            layout_family="footer_strip",
            content_brief=f"Minimal footer for {product}.",
        ),
    ]

    hints = {
        "hero": "hero_centered_minimal",
        "benefits": "bullet_block",
        "social_proof": "rating_line",
        "cta": "cta_button_with_subtext",
        "footer": "footer_minimal",
    }

    return PagePlan(
        workflow="waitlist",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints={},
    )
