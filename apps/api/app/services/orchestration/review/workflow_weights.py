"""Per-workflow weights for expert findings (O-04)."""

from __future__ import annotations

# Expert lens name → multiplier used when bumping severity (see ``merge_and_weight``).
_DEFAULT_WEIGHTS: dict[str, float] = {
    "Proposal Math Checker": 1.0,
    "Form Integrity": 1.0,
    "Deck Completeness": 1.0,
    "Accessibility": 1.0,
    "Brand Consistency": 1.25,
    "Voice Consistency": 1.35,
    "Expert Reviewer": 1.0,
}

_WORKFLOW_OVERRIDES: dict[str, dict[str, float]] = {
    "proposal": {"Proposal Math Checker": 1.35},
    "pitch_deck": {"Deck Completeness": 1.25},
    "contact_form": {"Form Integrity": 1.25},
}


def weights_for_workflow(workflow: str | None) -> dict[str, float]:
    base = dict(_DEFAULT_WEIGHTS)
    if workflow and workflow in _WORKFLOW_OVERRIDES:
        base.update(_WORKFLOW_OVERRIDES[workflow])
    return base


def weights_table_markdown(weights: dict[str, float]) -> str:
    lines = ["| Expert lens | Weight |", "|-------------|--------|"]
    for name in sorted(weights):
        lines.append(f"| {name} | {weights[name]:.2f} |")
    return "\n".join(lines)
