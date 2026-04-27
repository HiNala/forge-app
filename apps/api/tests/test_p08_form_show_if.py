"""P-08 — conditional form logic + tamper checks."""

import pytest

from app.services.form_show_if import (
    field_is_visible,
    validate_payload_against_form_schema_and_show_if,
    visible_field_names,
)


def test_show_if_eq_hides_and_shows() -> None:
    schema = {
        "fields": [
            {"name": "q1", "label": "Q1", "type": "text", "show_if": {"all": [{"field": "gate", "op": "eq", "value": "yes"}]}},
            {"name": "gate", "label": "Yes?", "type": "text"},
        ],
        "required": ["q1", "gate"],
    }
    p1 = {"gate": "no", "q1": ""}
    assert "q1" not in (visible_field_names(schema, p1) or set())
    ok, err = validate_payload_against_form_schema_and_show_if(schema, {"gate": "no", "q1": "hacker"})
    assert not ok
    assert "Unexpected" in err
    p2 = {"gate": "yes", "q1": "ok"}
    assert "q1" in (visible_field_names(schema, p2) or set())
    ok2, _ = validate_payload_against_form_schema_and_show_if(schema, p2)
    assert ok2


def test_field_is_visible_mismatch() -> None:
    assert field_is_visible(None, "x", {}) is True
    assert field_is_visible({"fields": []}, "x", {}) is True  # not listed -> no show_if in loop
