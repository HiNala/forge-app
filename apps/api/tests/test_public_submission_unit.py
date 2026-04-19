"""Unit tests for public submission helpers (no database)."""

from __future__ import annotations

from app.services.public_submission import (
    anonymize_ipv4_to_slash24,
    normalize_submit_fields,
    validate_payload_against_form_schema,
    visitor_fingerprint,
)


def test_anonymize_ipv4_maps_to_slash24_network() -> None:
    assert anonymize_ipv4_to_slash24("192.168.3.45") == "192.168.3.0"
    assert anonymize_ipv4_to_slash24(" 10.0.0.1 ") == "10.0.0.0"


def test_validate_required_fields_in_schema() -> None:
    schema = {"required": ["message"]}
    ok, _ = validate_payload_against_form_schema(schema, {"message": "hi"})
    assert ok
    ok2, detail = validate_payload_against_form_schema(schema, {})
    assert not ok2
    assert "message" in detail.lower()


def test_normalize_extracts_email_and_payload() -> None:
    e, n, p = normalize_submit_fields(
        {"email": "a@b.com", "name": "Pat", "message": "Hello", "extra": "1"}
    )
    assert e == "a@b.com"
    assert n == "Pat"
    assert p["message"] == "Hello"
    assert p["extra"] == "1"


def test_visitor_fingerprint_stable_for_same_inputs() -> None:
    a = visitor_fingerprint("1.2.3.4", "Mozilla/5.0")
    b = visitor_fingerprint("1.2.3.4", "Mozilla/5.0")
    assert a == b
    assert len(a) == 32
