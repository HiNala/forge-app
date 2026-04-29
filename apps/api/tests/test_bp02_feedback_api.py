"""Unit-style checks for BP-02 feedback→memory extraction (no DB)."""

from __future__ import annotations

from types import SimpleNamespace

from app.services.memory.feedback_to_memory import extract_memory_signals


def test_extract_too_busy_memory_signal():
    fb = SimpleNamespace(
        sentiment="negative",
        structured_reasons=["too_busy"],
        action_taken="",
        free_text="",
        artifact_kind="page",
        artifact_ref="main",
        id=None,
        run_id=None,
    )
    signals = extract_memory_signals(fb)  # type: ignore[arg-type]
    kinds = [s[0] for s in signals]
    assert "style_preference" in kinds


def test_positive_shows_in_extract():
    fb = SimpleNamespace(
        sentiment="positive",
        structured_reasons=[],
        action_taken="thumbs_up",
        free_text="",
        artifact_kind="page",
        artifact_ref="main",
        id=None,
        run_id=None,
    )
    signals = extract_memory_signals(fb)  # type: ignore[arg-type]
    assert any(s[0] == "approved_pattern" for s in signals)
