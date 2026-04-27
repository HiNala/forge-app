"""Template seed rows: intent JSON, page_type allow-list (P-06)."""

from __future__ import annotations

import json

import pytest

from app.seed_templates_data import curated_templates

_ALLOWED_PAGE_TYPES = frozenset(
    {
        "landing",
        "booking-form",
        "contact-form",
        "proposal",
        "pitch_deck",
        "rsvp",
        "menu",
        "portfolio",
        "link_in_bio",
        "waitlist",
        "gallery",
        "survey",
        "quiz",
        "coming_soon",
        "resume",
        "custom",
    }
)


def test_curated_templates_count() -> None:
    rows = curated_templates()
    assert len(rows) >= 55


@pytest.mark.parametrize("row", curated_templates())
def test_each_template_intent_and_page_type(row: dict) -> None:
    ij = row.get("intent_json")
    assert isinstance(ij, dict)
    raw = json.dumps(ij)
    assert json.loads(raw) == ij
    pt = ij.get("page_type")
    assert isinstance(pt, str)
    assert pt in _ALLOWED_PAGE_TYPES
    assert row.get("slug")
    assert row.get("html")
