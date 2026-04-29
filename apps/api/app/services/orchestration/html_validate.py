"""Lightweight HTML validation — Mission 03 Phase 5 (tolerant, no heavy deps)."""

from __future__ import annotations

import re
from html.parser import HTMLParser
from urllib.parse import urlparse

_DISALLOWED_TAGS = {"script", "object", "embed", "applet", "base"}
_DISALLOWED_SVG_TAGS = {"script", "foreignobject"}
_URL_ATTRS = {"href", "src", "action", "poster"}
_SAFE_URL_SCHEMES = {"", "http", "https", "mailto", "tel"}
_BAD_STYLE_TOKENS = ("expression(", "behavior:", "@import", "javascript:", "vbscript:")
_FORM_ACTION_RE = re.compile(r"^/p/[^/]+/[^/]+/submit/?$")


class _StructuralSafetyParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.reason = ""
        self._svg_depth = 0

    @property
    def ok(self) -> bool:
        return not self.reason

    def _fail(self, reason: str) -> None:
        if not self.reason:
            self.reason = reason

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._check_tag(tag, attrs)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._check_tag(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "svg" and self._svg_depth > 0:
            self._svg_depth -= 1

    def _check_tag(self, raw_tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.reason:
            return
        tag = raw_tag.lower()
        if tag == "svg":
            self._svg_depth += 1
        if tag in _DISALLOWED_TAGS:
            self._fail(f"<{tag}> tags are not allowed")
            return
        if self._svg_depth and tag in _DISALLOWED_SVG_TAGS:
            self._fail(f"Unsafe SVG tag <{tag}> is not allowed")
            return
        attr_map = {name.lower(): (value or "") for name, value in attrs}
        if tag == "meta" and (attr_map.get("http-equiv") or "").strip():
            self._fail("meta http-equiv tags are not allowed in generated HTML")
            return
        if tag == "iframe":
            self._fail("iframe tags are not allowed in generated HTML")
            return
        for name, value in attr_map.items():
            if name.startswith("on"):
                self._fail(f"Event handler attribute {name!r} is not allowed")
                return
            if name == "style" and any(tok in value.lower() for tok in _BAD_STYLE_TOKENS):
                self._fail("Unsafe CSS is not allowed in style attributes")
                return
            if name in _URL_ATTRS:
                url_reason = _unsafe_url_reason(tag, name, value)
                if url_reason:
                    self._fail(url_reason)
                    return


def _unsafe_url_reason(tag: str, attr: str, value: str) -> str:
    raw = value.strip()
    if not raw or raw.startswith("#"):
        return ""
    low = raw.lower()
    if low.startswith("data:"):
        if tag == "img" and attr == "src" and low.startswith("data:image/"):
            return ""
        return f"data: URLs are not allowed in {attr}"
    parsed = urlparse(raw)
    if parsed.scheme.lower() not in _SAFE_URL_SCHEMES:
        return f"{parsed.scheme}: URLs are not allowed"
    if attr == "action" and not _FORM_ACTION_RE.match(raw.rstrip("/")):
        return f"Form action must be /p/{{org}}/{{page}}/submit, got {raw!r}"
    return ""


def validate_structural_safety(html: str) -> tuple[bool, str]:
    """Parser-backed defense-in-depth check for generated/public HTML."""
    parser = _StructuralSafetyParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception as e:
        return False, f"Unable to parse HTML safely: {e}"
    if not parser.ok:
        return False, parser.reason
    return True, ""


def validate_generated_html(html: str) -> tuple[bool, str]:
    s = html.strip()
    if len(s) < 80:
        return False, "Document too short"
    low = s.lower()
    if "<html" not in low and "<!doctype" not in low:
        return False, "Missing document shell"
    if "<meta" not in low or "viewport" not in low:
        return False, "Missing viewport meta"
    ok, reason = validate_structural_safety(html)
    if not ok:
        return False, reason
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
    ok, reason = validate_structural_safety(html)
    if not ok:
        return False, reason
    return True, ""


def validate_compose_graph(
    html: str,
    *,
    requires_form: bool,
) -> tuple[bool, str]:
    """Graph validator — stricter checks before persistence (O-02)."""
    ok, reason = validate_generated_html(html)
    if not ok:
        return False, reason
    if "{{" in html and "}}" in html:
        return False, "Unresolved template tokens"
    if 'data-forge-section="' not in html.lower():
        return False, "Missing data-forge-section hooks"
    if requires_form and "<form" not in html.lower():
        return False, "Workflow requires a form element"
    if (
        requires_form
        and "type=\"submit\"" not in html.lower()
        and "type='submit'" not in html.lower()
        and "<button" not in html.lower()
    ):
        return False, "Workflow requires a submit control"
    for m in re.finditer(r"<img\b[^>]*>", html, re.IGNORECASE):
        tag = m.group(0)
        if re.search(r"\balt\s*=", tag, re.IGNORECASE) is None:
            return False, "Images must include alt text"
    return True, ""


def validate_section_html(fragment: str) -> tuple[bool, str]:
    f = fragment.strip()
    if len(f) < 10:
        return False, "Section too short"
    ok, reason = validate_structural_safety(f)
    if not ok:
        return False, reason
    return True, ""
