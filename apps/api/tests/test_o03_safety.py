"""Mission O-03 — safety sanitizer."""

from app.services.orchestration.composer.safety import sanitize_component_tree


def test_strips_banned_phrase() -> None:
    raw = {"components": [{"name": "paragraph_block", "props": {"body": "A seamless experience for you."}}]}
    out, flags = sanitize_component_tree(raw)
    assert "seamless" not in str(out).lower() or "[removed" in str(out).lower()
    assert flags
