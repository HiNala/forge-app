"""Pitch deck persistence + Studio HTML integration (W-03)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Deck, Organization, Page
from app.services.deck_builder import (
    build_slides_from_framework,
    default_theme,
    infer_deck_kind,
    infer_narrative_framework,
)
from app.services.deck_render import render_deck_html
from app.services.orchestration.models import PageIntent


async def get_or_create_deck_for_page(db: AsyncSession, *, page: Page) -> Deck:
    """Ensure a decks row exists for pitch_deck pages."""
    if page.page_type != "pitch_deck":
        raise ValueError("not a pitch_deck page")
    row = (
        await db.execute(select(Deck).where(Deck.page_id == page.id))
    ).scalar_one_or_none()
    if row:
        return row
    row = Deck(
        page_id=page.id,
        organization_id=page.organization_id,
        deck_kind="generic",
        narrative_framework="GENERIC_10",
        slides=[],
        slide_count=0,
        theme=default_theme("#2563EB", "#0F172A"),
    )
    db.add(row)
    await db.flush()
    return row


async def finalize_deck_studio_html(
    db: AsyncSession,
    *,
    page: Page,
    html: str,
    intent: PageIntent,
    prompt: str,
    title: str,
    org: Organization,
    primary: str,
    secondary: str,
) -> str:
    if intent.page_type != "pitch_deck":
        return html
    del html
    framework = intent.deck_narrative_framework
    if not framework:
        framework = infer_narrative_framework(prompt)
    kind = intent.deck_kind or infer_deck_kind(prompt)
    deck = await get_or_create_deck_for_page(db, page=page)
    slides = build_slides_from_framework(
        prompt=prompt,
        deck_title=title,
        organization_name=org.name,
        framework_key=framework,
    )
    deck.slides = slides
    deck.slide_count = len(slides)
    deck.deck_kind = kind
    deck.narrative_framework = framework
    deck.theme = default_theme(primary, secondary)
    await db.flush()
    return render_deck_html(
        org_name=org.name,
        org_slug=org.slug,
        page=page,
        deck=deck,
        primary=primary,
        secondary=secondary,
    )
