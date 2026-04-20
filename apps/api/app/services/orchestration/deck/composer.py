"""DeckComposer (W-03) — two-stage outline → expand; wired to deterministic builder today.

Stage A (outline): commit to slide count, layout slots, and one-line roles (narrative arc).
Stage B (expand): fill body, bullets, chart placeholders, speaker notes per slide.

LLM-backed expansion can replace :func:`build_slides_from_framework` incrementally; the
pipeline currently uses that function as a single-shot stand-in so Studio always gets
valid `Slide` JSON + rendered HTML.
"""

from __future__ import annotations

from typing import Any

from app.services.deck_builder import build_slides_from_framework


async def compose_deck_slides(
    *,
    prompt: str,
    deck_title: str,
    organization_name: str,
    framework_key: str | None = None,
) -> list[dict[str, Any]]:
    """Return slide dicts ready for ``decks.slides`` JSONB (validated by ``Slide``)."""
    return build_slides_from_framework(
        prompt=prompt,
        deck_title=deck_title,
        organization_name=organization_name,
        framework_key=framework_key,
    )


async def compose_deck_outline_only(
    *,
    prompt: str,
    deck_title: str,
    organization_name: str = "Organization",
    framework_key: str | None = None,
) -> list[dict[str, Any]]:
    """Reserved for Stage-A-only LLM outline; currently returns full slides for compatibility."""
    return await compose_deck_slides(
        prompt=prompt,
        deck_title=deck_title,
        organization_name=organization_name,
        framework_key=framework_key,
    )
