"""GL-01 — event taxonomy registry and validation."""

from __future__ import annotations

import pytest

from app.services.analytics.events import EVENTS, is_valid_event_type, validate_event_payload


def test_every_event_has_category_and_scope() -> None:
    for name, ed in EVENTS.items():
        assert ed.name == name
        assert ed.category in (
            "traffic",
            "form",
            "booking",
            "proposal",
            "deck",
            "studio",
            "lifecycle",
            "error",
        )
        assert ed.scope in ("public", "authenticated", "both")


def test_unknown_event_rejected() -> None:
    ok, err = validate_event_payload("not_a_real_event_ever", {"page_id": "x"})
    assert ok is False
    assert err is not None


def test_custom_pattern() -> None:
    assert is_valid_event_type("custom.acme.signup_click") is True
    assert is_valid_event_type("custom..bad") is False


def test_page_view_requires_page_id_in_metadata() -> None:
    ok, err = validate_event_payload("page_view", {})
    assert ok is False
    assert "page_id" in (err or "")


def test_page_view_ok() -> None:
    ok, err = validate_event_payload("page_view", {"page_id": "abc"})
    assert ok is True
    assert err is None
