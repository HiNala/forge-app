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

    biz = intent.business_type or intent.title or "this business"
    action = intent.primary_action or "get in touch"
    diffs = intent.key_differentiators
    customer = intent.target_customer or "potential customers"
    diff_str = (" Differentiators to highlight: " + "; ".join(diffs[:4]) + ".") if diffs else ""

    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=(
                f"Hero for {biz}. Use headline: '{intent.headline or intent.title_suggestion}'. "
                f"Subtitle: '{intent.subheadline or ''}'. Visual direction: {intent.visual_direction}."
            ),
        ),
        SectionSpec(
            id="value",
            role="value",
            priority=1,
            layout_family="two_column",
            content_brief=(
                f"Explain why {biz} is the right choice for {customer}. "
                f"Use bullet_block or numbered_steps.{diff_str}"
            ),
        ),
        SectionSpec(
            id="proof",
            role="social_proof",
            priority=2,
            layout_family="card_grid",
            content_brief=(
                "Social proof section. Use testimonial_card if the brief includes quotes or names. "
                "Use rating_line if a rating is mentioned. Use logo_wall if partner/client logos are mentioned. "
                "Skip this section entirely if no credible proof signals exist — do not fabricate."
            ),
        ),
        SectionSpec(
            id="cta",
            role="cta",
            priority=3,
            layout_family="single_column",
            content_brief=f"Full-width CTA strip driving visitors to {action}. Headline in ≤10 words.",
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=4,
            layout_family="footer_strip",
            content_brief=f"Footer for {biz}.",
        ),
    ]
    hints = {
        "hero": "hero_full_bleed" if intent.visual_direction == "bold" else "hero_split",
        "value": "bullet_block",
        "proof": "testimonial_card",
        "cta": "cta_full_width",
        "footer": "footer_minimal",
    }
    return PagePlan(
        workflow="landing",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints={},
    )
