"""Resume / personal site — hero → experience → projects → skills → education → contact."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_resume(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    name = intent.title or intent.headline or intent.title_suggestion or "Your name"
    role = intent.business_type or intent.target_customer or "Professional"
    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="single_column",
            content_brief=(
                f"Resume hero: {name} — {role}. One-liner value prop, headshot area, contact icons."
            ),
        ),
        SectionSpec(
            id="summary",
            role="value",
            priority=1,
            layout_family="single_column",
            content_brief="2–3 short paragraphs: positioning, impact, what you are looking for next.",
        ),
        SectionSpec(
            id="experience",
            role="content",
            priority=2,
            layout_family="card_grid",
            content_brief="2–4 roles: company, title, dates, 3 tight bullets of outcomes.",
        ),
        SectionSpec(
            id="projects",
            role="showcase",
            priority=3,
            layout_family="card_grid",
            content_brief="3–6 project cards: name, 1 line outcome, link.",
        ),
        SectionSpec(
            id="skills",
            role="value",
            priority=4,
            layout_family="card_grid",
            content_brief="Categorized skills as chips; tools and domains.",
        ),
        SectionSpec(
            id="education",
            role="content",
            priority=5,
            layout_family="single_column",
            content_brief="Education + optional certifications, compact.",
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=6,
            layout_family="footer_strip",
            content_brief="Email + site link, PDF download CTA if relevant.",
        ),
    ]
    return PagePlan(workflow="resume", sections=sections, brand_tokens=brand, voice_profile=voice)

