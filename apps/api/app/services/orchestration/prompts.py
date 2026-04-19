"""Load Mission 03 system prompts from packaged files."""

from __future__ import annotations

from pathlib import Path

_DIR = Path(__file__).resolve().parent / "prompts"


def load_prompt(name: str) -> str:
    path = _DIR / f"{name}.md"
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")
