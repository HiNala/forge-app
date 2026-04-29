"""Portfolio / case-study planner — professional work showcase."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_portfolio(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)

    biz = intent.business_type or intent.title or "this studio"
    action = intent.primary_action or "start a project"
    customer = intent.target_customer or "potential clients"
    diffs = intent.key_differentiators
    diff_str = (" Specialties: " + "; ".join(diffs[:4]) + ".") if diffs else ""

    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=(
                f"Portfolio hero for {biz}. Headline: '{intent.headline or intent.title_suggestion}'. "
                f"Subheadline: '{intent.subheadline or ''}'. "
                "Keep it confident and minimal — let the work speak. Visual direction: "
                f"{intent.visual_direction}."
            ),
        ),
        SectionSpec(
            id="work",
            role="showcase",
            priority=1,
            layout_family="card_grid",
            content_brief=(
                f"Case study grid for {biz}. Show 2–4 project cards.{diff_str} "
                "Each card: project name, client or industry, 1-sentence outcome, "
                "visual tag (e.g. 'Brand', 'Web', 'UI/UX'). "
                "Make outcomes specific and results-oriented (not 'we designed a logo', "
                "but 'redesigned identity, increased brand recognition 40%')."
            ),
        ),
        SectionSpec(
            id="process",
            role="value",
            priority=2,
            layout_family="single_column",
            content_brief=(
                f"How {biz} works — numbered 3–4 step process. "
                "Steps might be: Discovery, Strategy, Design, Launch (or similar to their field). "
                "Use numbered_steps component. Make it feel like a premium, thoughtful process."
            ),
        ),
        SectionSpec(
            id="proof",
            role="social_proof",
            priority=3,
            layout_family="card_grid",
            content_brief=(
                "1–2 client testimonials specific to the work quality and results. "
                "If no quotes mentioned, use rating_line with '5-star rated' claim instead. "
                "Never fabricate specific names — use role/company type only."
            ),
        ),
        SectionSpec(
            id="cta",
            role="cta",
            priority=4,
            layout_family="single_column",
            content_brief=(
                f"CTA section driving {customer} to {action}. "
                "Headline should feel exclusive and collaborative, not salesy. "
                "E.g. 'Let's build something great together.' Button: 'Start a project'."
            ),
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=5,
            layout_family="footer_strip",
            content_brief=f"Footer for {biz}.",
        ),
    ]

    hints = {
        "hero": "hero_centered_minimal" if intent.visual_direction == "minimal" else "hero_full_bleed",
        "work": "case_study_card",
        "process": "numbered_steps",
        "proof": "testimonial_card",
        "cta": "cta_button_with_subtext",
        "footer": "footer_with_contact",
    }

    return PagePlan(
        workflow="portfolio",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints={},
    )
