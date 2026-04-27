"""Quiz — intro → question screens → outcome or score screen."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_quiz(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    topic = intent.title or intent.headline or intent.title_suggestion or "this quiz"
    sections: list[SectionSpec] = [
        SectionSpec(
            id="intro",
            role="intro",
            priority=0,
            layout_family="single_column",
            content_brief=(
                f"Quiz intro: title, what they will learn, “Start” energy — for “{topic}”. "
                "Keep it playful and skimmable."
            ),
        ),
        SectionSpec(
            id="questions",
            role="form",
            priority=1,
            layout_family="card_grid",
            content_brief=(
                f"5–10 single-screen questions. 2–4 options each, tight copy. For “{topic}”. "
                "Prefer outcome-tagged options or clearly correct knowledge answers per mission mode."
            ),
        ),
        SectionSpec(
            id="result",
            role="cta",
            priority=2,
            layout_family="single_column",
            content_brief="Results panel: primary outcome or score, short explanation, one CTA.",
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=3,
            layout_family="footer_strip",
            content_brief="Minimal footer.",
        ),
    ]
    return PagePlan(workflow="quiz", sections=sections, brand_tokens=brand, voice_profile=voice)

