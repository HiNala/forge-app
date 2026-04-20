"""W-03 — framework invariants, slide builder, render shape (no DB)."""

from __future__ import annotations

import copy
from types import SimpleNamespace
from uuid import uuid4

from app.schemas.deck_blocks import Slide
from app.services.deck_builder import build_slides_from_framework, infer_narrative_framework
from app.services.deck_public_inject import inject_deck_public_runtime
from app.services.deck_render import render_deck_html
from app.services.orchestration.deck.frameworks import (
    FRAMEWORKS,
    SEQUOIA_PITCH,
    Y_COMBINATOR_PITCH,
)


def test_sequoia_framework_length() -> None:
    assert len(SEQUOIA_PITCH) >= 10


def test_each_framework_non_empty() -> None:
    for name, steps in FRAMEWORKS.items():
        assert len(steps) >= 6, name


def test_build_slides_valid_pydantic() -> None:
    raw = build_slides_from_framework(
        prompt="Series A pitch for my AI coffee ordering app",
        deck_title="Caffeine AI",
        organization_name="Demo Org",
        framework_key="SEQUOIA_PITCH",
    )
    assert len(raw) == len(SEQUOIA_PITCH)
    for row in raw:
        Slide.model_validate(row)


def test_infer_framework_yc() -> None:
    assert (
        infer_narrative_framework("Y Combinator batch application deck for my startup")
        == "Y_COMBINATOR_PITCH"
    )


def test_build_slides_follow_framework_layout_and_roles() -> None:
    raw = build_slides_from_framework(
        prompt="Pitch",
        deck_title="Co",
        organization_name="Org",
        framework_key="Y_COMBINATOR_PITCH",
    )
    assert len(raw) == len(Y_COMBINATOR_PITCH)
    for i, (layout, role, _hint) in enumerate(Y_COMBINATOR_PITCH):
        assert raw[i]["layout"] == layout
        assert raw[i]["metadata"]["role"] == role


def test_single_slide_title_override_preserves_rest() -> None:
    raw = build_slides_from_framework(
        prompt="Series A",
        deck_title="Acme",
        organization_name="Acme Inc",
        framework_key="SEQUOIA_PITCH",
    )
    assert len(raw) == len(SEQUOIA_PITCH)
    before = copy.deepcopy(raw)
    raw[3]["title"] = "Only this slide"
    for i, row in enumerate(before):
        if i == 3:
            continue
        assert raw[i] == row


def test_chart_slide_includes_sr_table() -> None:
    page = SimpleNamespace(id=uuid4(), slug="demo", title="Demo")
    deck = SimpleNamespace(
        slides=[
            {
                "id": "c1",
                "order": 0,
                "layout": "chart",
                "title": "Growth",
                "chart": {
                    "chart_type": "bar",
                    "labels": ["Q1", "Q2"],
                    "series": [{"name": "Rev", "data": [1, 2]}],
                },
                "metadata": {},
            },
        ],
        theme={"primary": "#111", "secondary": "#222"},
    )
    org = SimpleNamespace(name="Org", slug="org")
    html = render_deck_html(org_name=org.name, org_slug=org.slug, page=page, deck=deck)
    assert "forge-chart-sr-only" in html
    assert "<th scope='row'>Q1</th>" in html


def test_inject_deck_adds_track_attrs() -> None:
    page = SimpleNamespace(id=uuid4(), slug="demo", title="Demo")
    deck = SimpleNamespace(slides=[], theme={})
    org = SimpleNamespace(name="Org", slug="org")
    html = render_deck_html(org_name=org.name, org_slug=org.slug, page=page, deck=deck)
    out = inject_deck_public_runtime(
        html,
        api_base="https://api.example.com",
        org_slug="org",
        page_slug="demo",
        page_id="abc-123",
    )
    assert "data-forge-deck-root" in out
    assert "data-forge-track-endpoint" in out
    assert "forge-deck-public-js" in out


def test_render_includes_snap_and_sections() -> None:
    page = SimpleNamespace(id=uuid4(), slug="demo", title="Demo")
    deck = SimpleNamespace(
        slides=[
            {
                "id": "slide_a",
                "order": 0,
                "layout": "title_cover",
                "title": "Hello",
                "subtitle": "Co",
                "metadata": {},
            },
            {
                "id": "slide_b",
                "order": 1,
                "layout": "single_takeaway",
                "title": "Problem",
                "body": "Pain",
                "metadata": {},
            },
        ],
        theme={"primary": "#111", "secondary": "#222"},
    )
    org = SimpleNamespace(name="Org", slug="org")
    html = render_deck_html(org_name=org.name, org_slug=org.slug, page=page, deck=deck)
    assert "scroll-snap-type" in html
    assert "data-forge-slide" in html and "slide_a" in html
