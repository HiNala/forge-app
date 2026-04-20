"""Pitch deck — title + slide sequence; deck HTML is finalized in deck_service."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_pitch_deck(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    fw = intent.deck_narrative_framework
    if intent.deck and intent.deck.narrative_framework:
        fw = intent.deck.narrative_framework or fw
    sections: list[SectionSpec] = [
        SectionSpec(
            id="deck_shell",
            role="deck",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=(
                f"Pitch deck for {intent.title or intent.title_suggestion}; "
                f"framework {fw or 'default'} — slides rendered via deck pipeline."
            ),
        ),
    ]
    return PagePlan(
        workflow="pitch_deck",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints={"deck_shell": "hero-centered"},
        data_hints={"framework": fw, "deck_kind": intent.deck_kind},
    )
