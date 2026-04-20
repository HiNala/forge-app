"""Expert lens metadata for reviewer prompt (O-04)."""

from __future__ import annotations

from typing import NamedTuple


class ExpertLens(NamedTuple):
    name: str
    focus: str


EXPERT_PANEL: tuple[ExpertLens, ...] = (
    ExpertLens("Dieter Rams", "Simplicity and honest materials"),
    ExpertLens("Susan Kare", "Iconography, metaphor, and clarity at small sizes"),
    ExpertLens("Don Norman", "Affordances, signifiers, and cognitive load"),
    ExpertLens("Jakob Nielsen", "Usability heuristics"),
    ExpertLens("Margaret Calvert", "Wayfinding, legibility, and typographic systems"),
    ExpertLens("Paul Rand", "Brand hierarchy and visual rhythm"),
    ExpertLens("Accessibility", "WCAG-oriented checks"),
)
