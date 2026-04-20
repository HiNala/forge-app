"""Menu page — hero → categories → items."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_menu(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    menu_hints: list[str] = []
    if intent.menu and intent.menu.sections_hint:
        menu_hints = intent.menu.sections_hint
    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=f"Menu for {intent.title_suggestion}",
        ),
        SectionSpec(
            id="menu_body",
            role="menu",
            priority=1,
            layout_family="single_column",
            content_brief="Menu sections and items — "
            + (", ".join(menu_hints) if menu_hints else "use context products if any"),
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=2,
            layout_family="footer_strip",
            content_brief="Footer",
        ),
    ]
    return PagePlan(
        workflow="menu",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
        component_hints={"hero": "hero-centered", "menu_body": "hero-centered", "footer": "footer-minimal"},
        data_hints={"menu_sections": menu_hints},
    )
