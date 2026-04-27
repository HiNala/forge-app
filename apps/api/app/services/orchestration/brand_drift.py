"""Brand / voice drift signals (V2 P-05) — shared across workflows."""

from __future__ import annotations

import re
from typing import Any


def hex_colors_in_html(html: str) -> list[str]:
    return re.findall(r"#[0-9A-Fa-f]{3,8}\b", html or "")


def colors_outside_palette(html: str, allowed: set[str]) -> list[str]:
    out: list[str] = []
    for h in hex_colors_in_html(html):
        hl = h.lower()
        if hl not in allowed and hl not in {a.lower() for a in allowed}:
            out.append(h)
    return out


def drift_report(html: str, brand_tokens: dict[str, Any]) -> dict[str, Any]:
    """Lightweight heuristics — pair with review LLM for voice (O-04)."""
    allow = {brand_tokens.get("primary"), brand_tokens.get("secondary")}
    allow = {x for x in allow if isinstance(x, str) and x.startswith("#")}
    bad_colors = colors_outside_palette(html, allow) if allow else []
    return {
        "color_drift": bad_colors[:20],
        "font_drift_suspected": False,
    }
