"""Expert lens metadata for reviewer prompt (O-04)."""

from __future__ import annotations

from typing import NamedTuple


class ExpertLens(NamedTuple):
    key: str
    focus: str


EXPERT_PANEL: tuple[ExpertLens, ...] = (
    ExpertLens("Dieter Rams", "Simplicity and honest materials"),
    ExpertLens("Jakob Nielsen", "Usability heuristics"),
    ExpertLens("Accessibility", "WCAG-oriented checks"),
)
