"""Map Studio / API ``forced_workflow`` strings onto ``PageIntent.workflow``."""

from __future__ import annotations

from app.services.orchestration.models import PageIntent


def _norm(s: str) -> str:
    return s.strip().lower().replace("-", "_")


# Normalized keys (lowercase, underscores).
_NORM: dict[str, str] = {
    "contact_form": "contact_form",
    "booking_form": "contact_form",
    "proposal": "proposal",
    "pitch_deck": "pitch_deck",
    "landing": "landing",
    "landing_page": "landing",
    "menu": "menu",
    "event_rsvp": "event_rsvp",
    "rsvp": "event_rsvp",
    "gallery": "gallery",
    "link_in_bio": "link_in_bio",
    "survey": "survey",
    "quiz": "quiz",
    "coming_soon": "coming_soon",
    "resume": "resume",
    "waitlist": "waitlist",
    "promotion": "promotion",
    "portfolio": "portfolio",
    "faq": "faq",
    "linktree": "link_in_bio",
}


def apply_forced_workflow(intent: PageIntent, forced: str | None) -> PageIntent:
    if not (forced and forced.strip()):
        return intent
    wf = _NORM.get(_norm(forced))
    if wf is None:
        return intent
    data = intent.model_dump()
    data["workflow"] = wf
    data["confidence"] = max(float(intent.confidence or 0), 0.95)
    return PageIntent.model_validate(data)
