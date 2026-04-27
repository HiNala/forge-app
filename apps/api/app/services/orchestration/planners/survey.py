"""Multi-step survey — intro → 5–15 question steps → thank-you / optional capture."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_survey(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    topic = intent.title or intent.headline or intent.title_suggestion or "this survey"
    sections: list[SectionSpec] = [
        SectionSpec(
            id="intro",
            role="intro",
            priority=0,
            layout_family="single_column",
            content_brief=(
                f"Survey intro for “{topic}”. Why it matters, time estimate, privacy note if anonymous. "
                "Set expectations before step 1."
            ),
        ),
        SectionSpec(
            id="questions",
            role="form",
            priority=1,
            layout_family="card_grid",
            content_brief=(
                f"5–15 clear questions for “{topic}”. Mix ratings, single-choice, and one open text. "
                "Progress should feel light — no walls of text."
            ),
        ),
        SectionSpec(
            id="thankyou",
            role="success",
            priority=2,
            layout_family="single_column",
            content_brief="Thank-you panel with optional share line or CTA to learn more.",
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=3,
            layout_family="footer_strip",
            content_brief="Minimal footer with org name.",
        ),
    ]
    return PagePlan(workflow="survey", sections=sections, brand_tokens=brand, voice_profile=voice)

