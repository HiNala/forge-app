"""Pitch deck intent helpers (W-03)."""

from __future__ import annotations

import re

DECK_KEYWORDS = frozenset(
    {
        "pitch deck",
        "slide deck",
        "investor deck",
        "keynote",
        "board deck",
        "all-hands",
        "all hands",
        "quarterly review",
        "conference talk",
        "lecture slides",
        "presentation deck",
        "slides for",
        "deck for",
    }
)


def prompt_suggests_pitch_deck(prompt: str) -> bool:
    p = prompt.lower()
    if any(k in p for k in DECK_KEYWORDS):
        return True
    return bool(re.search(r"\b(slides?|deck)\b.*\b(for|about)\b", p))
