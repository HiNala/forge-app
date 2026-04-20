"""Lightweight accessibility heuristics on composed HTML (O-04)."""

from __future__ import annotations

import re

from app.services.orchestration.review.models import Finding


def run_a11y_checks(html: str) -> list[Finding]:
    """Return findings for common issues (images without alt, missing main landmark)."""
    out: list[Finding] = []
    if not html.strip():
        return out
    if re.search(r"<img[^>]*>", html, re.I) and not re.search(r"<img[^>]*\balt\s*=", html, re.I):
        out.append(
            Finding(
                expert="Accessibility",
                severity="major",
                section_ref=None,
                dimension="img_alt",
                message="At least one <img> appears without an alt attribute.",
                specific_quote=None,
                suggested_action="Add descriptive alt text or alt=\"\" for decorative images.",
                auto_fixable=False,
                confidence=0.85,
            )
        )
    if not re.search(r"<main\b", html, re.I) and "<body" in html.lower():
        out.append(
            Finding(
                expert="Accessibility",
                severity="suggestion",
                section_ref=None,
                dimension="landmark_main",
                message="Page HTML has no <main> landmark.",
                specific_quote=None,
                suggested_action="Wrap primary content in <main> for screen readers.",
                auto_fixable=False,
                confidence=0.55,
            )
        )
    return out
