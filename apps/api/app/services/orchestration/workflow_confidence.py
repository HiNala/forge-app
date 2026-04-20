"""Heuristic workflow ambiguity for Studio SSE — no extra LLM calls."""

from __future__ import annotations

from typing import Any

from app.schemas.deck_intent import prompt_suggests_pitch_deck
from app.schemas.proposal_intent import prompt_suggests_proposal
from app.services.orchestration.models import PageIntent

FLAGSHIP_TYPES: frozenset[str] = frozenset({"contact-form", "booking-form", "proposal", "pitch_deck"})
_CONFIDENCE_THRESHOLD = 0.65


def _proposal_score(prompt: str) -> float:
    if prompt_suggests_proposal(prompt):
        return 0.88
    p = prompt.lower()
    keys = ("proposal", "quote", "bid", "estimate", "contract", "sow", "scope of work", "sign off")
    hits = sum(1 for k in keys if k in p)
    return min(1.0, 0.18 + hits * 0.14)


def _deck_score(prompt: str) -> float:
    if prompt_suggests_pitch_deck(prompt):
        return 0.88
    p = prompt.lower()
    keys = ("deck", "pitch", "investor", "slide", "series ", "fundraise", "demo day", "yc ")
    hits = sum(1 for k in keys if k in p)
    return min(1.0, 0.18 + hits * 0.14)


def _contact_booking_score(prompt: str) -> float:
    p = prompt.lower()
    keys = (
        "contact",
        "book",
        "booking",
        "calendar",
        "schedule",
        "appointment",
        "form",
        "inquiry",
        "enquiry",
        "rsvp",
        "request a",
        "get in touch",
        "pick a time",
    )
    hits = sum(1 for k in keys if k in p)
    strong = 0.25 if ("booking" in p or "calendar" in p or "schedule" in p) else 0.0
    return min(1.0, 0.15 + strong + hits * 0.09)


def confidence_for_page_type(prompt: str, page_type: str) -> float:
    if page_type in ("contact-form", "booking-form"):
        return _contact_booking_score(prompt)
    if page_type == "proposal":
        return _proposal_score(prompt)
    if page_type == "pitch_deck":
        return _deck_score(prompt)
    return 1.0


def _label_for(workflow: str) -> str:
    return {
        "contact-form": "Contact form",
        "booking-form": "Booking page",
        "proposal": "Proposal",
        "pitch_deck": "Pitch deck",
    }.get(workflow, workflow)


def _rationale(workflow: str, score: float) -> str:
    return f"Matched as {_label_for(workflow)} — score {score:.2f}"


def maybe_workflow_clarify(
    prompt: str,
    intent: PageIntent,
) -> dict[str, Any] | None:
    """
    When the resolved workflow is flagship but heuristic confidence is low,
    emit a non-blocking workflow_clarify SSE payload before intent streaming continues.
    """
    if intent.page_type not in FLAGSHIP_TYPES:
        return None
    conf = confidence_for_page_type(prompt, intent.page_type)
    if conf >= _CONFIDENCE_THRESHOLD:
        return None

    scores: dict[str, float] = {
        "contact-form": _contact_booking_score(prompt),
        "proposal": _proposal_score(prompt),
        "pitch_deck": _deck_score(prompt),
    }
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    candidates: list[dict[str, Any]] = []
    for wf, sc in ranked[:3]:
        candidates.append(
            {
                "workflow": wf,
                "confidence": round(sc, 3),
                "rationale": _rationale(wf, sc),
            }
        )

    default = intent.page_type
    return {
        "candidates": candidates,
        "default": default,
        "message": (
            "I'm not sure which workflow fits best — tap one to steer the build, "
            "or keep going and I'll use the default."
        ),
    }
