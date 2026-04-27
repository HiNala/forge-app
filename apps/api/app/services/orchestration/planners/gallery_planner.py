"""Gallery / portfolio page — hero → image grid → about → small inquiry form."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan, SectionSpec

from ._brand import brand_tokens_from_bundle
from ._voice import voice_from_bundle


def plan_gallery_page(intent: PageIntent, bundle: ContextBundle | None) -> PagePlan:
    voice = voice_from_bundle(bundle)
    brand = brand_tokens_from_bundle(bundle)
    biz = intent.business_type or intent.title or "this portfolio"
    sections: list[SectionSpec] = [
        SectionSpec(
            id="hero",
            role="hero",
            priority=0,
            layout_family="full_bleed_hero",
            content_brief=(
                f"Photography / design hero for {biz}. Name + 1-paragraph story + primary contact CTA."
            ),
        ),
        SectionSpec(
            id="grid",
            role="showcase",
            priority=1,
            layout_family="card_grid",
            content_brief=(
                "gallery_grid: 6–12 images with short captions. Square or wide cinematic variant."
            ),
        ),
        SectionSpec(
            id="about",
            role="value",
            priority=2,
            layout_family="single_column",
            content_brief="Longer bio, specialties, and regions served if relevant.",
        ),
        SectionSpec(
            id="inquiry",
            role="form",
            priority=3,
            layout_family="single_column",
            content_brief="Small 'Book / hire' form: name, email, project type, message.",
        ),
        SectionSpec(
            id="footer",
            role="footer",
            priority=4,
            layout_family="footer_strip",
            content_brief="Social + copyright.",
        ),
    ]
    return PagePlan(
        workflow="gallery",
        sections=sections,
        brand_tokens=brand,
        voice_profile=voice,
    )

