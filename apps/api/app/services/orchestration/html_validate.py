"""Lightweight HTML validation — Mission 03 Phase 5 (tolerant, no heavy deps)."""

from __future__ import annotations

import re


def validate_generated_html(html: str) -> tuple[bool, str]:
    s = html.strip()
    if len(s) < 80:
        return False, "Document too short"
    low = s.lower()
    if "<html" not in low and "<!doctype" not in low:
        return False, "Missing document shell"
    if "<meta" not in low or "viewport" not in low:
        return False, "Missing viewport meta"
    if re.search(r"<script", low):
        return False, "Script tags are not allowed in generated pages (MVP)"
    if "javascript:" in low:
        return False, "javascript: URLs are not allowed"
    if re.search(r"style\s*=", low) and "javascript:" in low:
        return False, "javascript: in styles not allowed"
    action_ok = re.compile(r"^/p/[^/]+/[^/]+/submit/?$")
    for m in re.finditer(r'<form[^>]*action="([^"]*)"', html, re.IGNORECASE):
        act = m.group(1).strip()
        if not action_ok.match(act.rstrip("/")):
            return False, f"Form action must be /p/{{org}}/{{page}}/submit, got {act!r}"
    return True, ""


def validate_publishable_html(html: str) -> tuple[bool, str]:
    """Pre-publish checks: document shell, viewport, no scripts; form action not enforced."""
    s = html.strip()
    if len(s) < 80:
        return False, "Document too short"
    low = s.lower()
    if "<html" not in low and "<!doctype" not in low:
        return False, "Missing document shell"
    if "<meta" not in low or "viewport" not in low:
        return False, "Missing viewport meta"
    if re.search(r"<script", low):
        return False, "Script tags are not allowed in published pages"
    if "javascript:" in low:
        return False, "javascript: URLs are not allowed"
    return True, ""


def validate_section_html(fragment: str) -> tuple[bool, str]:
    f = fragment.strip()
    if len(f) < 10:
        return False, "Section too short"
    if "<script" in f.lower():
        return False, "Script tags not allowed in section"
    return True, ""
