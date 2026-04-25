"""Link-in-bio planner — creator / influencer single-page hub."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_link_in_bio(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)

    name = intent.title or "Creator"
    bio = intent.subheadline or intent.headline or ""
    diffs = intent.key_differentiators

    sections: list[SectionSpec] = [
        SectionSpec(
            id="profile",
            role="hero",
            priority=0,
            layout_family="single_column",
            content_brief=(
                f"Profile header for {name}. Centered layout. "
                f"Large avatar/photo placeholder (round, 96px). Name as h1. "
                f"Short bio (1–2 sentences): '{bio}'. "
                "Below the bio, optionally show 2–3 social handle chips (e.g. @handle on Instagram, YouTube). "
                "Keep it minimal — this is a mobile-first page."
            ),
        ),
        SectionSpec(
            id="links",
            role="cta",
            priority=1,
            layout_family="single_column",
            content_brief=(
                f"Stacked link buttons for {name}. "
                f"Generate 4–6 link buttons based on context. "
                + (f"Signals: {'; '.join(diffs[:5])}. " if diffs else "")
                + "Each button: label + optional emoji prefix, full-width rounded card style. "
                "Use link_button_list component. "
                "Examples: '🎥 Watch my latest video', '📚 My online course', '🛍 Shop my merch', "
                "'📧 Join my newsletter', '🎙 Listen to podcast', '💬 Book a 1:1 call'."
            ),
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=2,
            layout_family="footer_strip",
            content_brief=f"Minimal footer for {name} — just copyright and powered-by line.",
        ),
    ]

    hints = {
        "profile": "hero_centered_minimal",
        "links": "link_button_list",
        "footer": "footer_minimal",
    }

    return PagePlan(
        workflow="link_in_bio",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints=hints,
        data_hints={},
    )
