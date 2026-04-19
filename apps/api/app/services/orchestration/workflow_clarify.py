"""Heuristic: when ``page_type`` is custom, suggest candidate workflows from the prompt."""

from __future__ import annotations

import re

from app.services.orchestration.models import PageIntent

QUOTE_RE = re.compile(r"\b(quote|estimate|proposal|pitch|deck)\b", re.I)
CONTACT_RE = re.compile(r"\b(contact|form|lead|inquiry|rsvp|booking)\b", re.I)


def build_workflow_clarify(prompt: str, intent: PageIntent) -> dict[str, object] | None:
    """Return clarification options when the intent is ambiguous (custom page_type)."""
    if intent.page_type != "custom":
        return None
    p = prompt.lower()
    candidates: list[dict[str, str]] = []
    if QUOTE_RE.search(p):
        candidates.append({"workflow": "proposal"})
    if CONTACT_RE.search(p):
        candidates.append({"workflow": "contact_form"})
    if len(candidates) < 2:
        candidates = [
            {"workflow": "proposal"},
            {"workflow": "contact_form"},
        ]
    default = candidates[0]["workflow"]
    return {"candidates": candidates, "default": default}
