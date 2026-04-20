"""Load versioned composer system prompts (Mission O-03)."""

from __future__ import annotations

from pathlib import Path

_COMPOSERS_DIR = Path(__file__).resolve().parent / "prompts" / "composers"
_REVIEWERS_DIR = Path(__file__).resolve().parent / "prompts" / "reviewers"


def load_composer_prompt(filename: str) -> str:
    """Load ``filename`` (e.g. ``contact_form.v1.md``) from the composers directory."""
    p = _COMPOSERS_DIR / filename
    if not p.is_file():
        return ""
    return p.read_text(encoding="utf-8")


def composers_dir() -> Path:
    return _COMPOSERS_DIR


def load_reviewer_prompt() -> str:
    """O-04 expert panel system prompt."""
    p = _REVIEWERS_DIR / "panel.v1.md"
    if not p.is_file():
        return ""
    return p.read_text(encoding="utf-8")
