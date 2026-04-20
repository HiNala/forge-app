"""Lightweight content safety before validation (Mission O-03)."""

from __future__ import annotations

import re
from typing import Any

# Minimal blocklist — extend with org policy later.
_BANNED_PHRASES = re.compile(
    r"\b("
    r"cutting-edge solutions|seamless experience|elevate your business|best-in-class|"
    r"synergies|turnkey solution"
    r")\b",
    re.IGNORECASE,
)

_SUPERLATIVE_CLAIMS = re.compile(
    r"#1\s+\w+\s+in\s+(california|the\s+us|america|the\s+world)",
    re.IGNORECASE,
)


def sanitize_component_tree(tree_dict: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Return sanitized tree copy and list of human-readable flags."""
    flags: list[str] = []
    raw = str(tree_dict).lower()
    if _SUPERLATIVE_CLAIMS.search(raw):
        flags.append("removed_or_flagged_unverified_superlative")
    if _BANNED_PHRASES.search(raw):
        flags.append("banned_marketing_phrase_detected")
    # Deep replace in strings only (conservative).
    out = _strip_banned_in_obj(tree_dict)
    return out, flags


def _strip_banned_in_obj(obj: Any) -> Any:
    if isinstance(obj, str):
        return _BANNED_PHRASES.sub("[removed marketing cliché]", obj)
    if isinstance(obj, list):
        return [_strip_banned_in_obj(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _strip_banned_in_obj(v) for k, v in obj.items()}
    return obj
