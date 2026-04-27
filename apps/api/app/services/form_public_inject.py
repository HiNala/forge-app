"""Inject public runtimes for P-08: conversational form mode + optional Pro custom CSS hint."""

from __future__ import annotations

import json
import re
from typing import Any

_HTML_RE = re.compile(r"<html[^>]*>", re.IGNORECASE)


def _sanitize_custom_css_block(css: str) -> str:
    s = css.strip()
    if not s:
        return ""
    low = s.lower()
    if "@import" in low or "expression(" in low or "moz-binding" in low:
        return ""
    if re.search(r"url\s*\(\s*['\"]?https?://", low):
        return ""
    return s


def _proish_plan(plan: str | None) -> bool:
    p = (plan or "trial").lower()
    if p in ("pro", "business", "max", "max_5x", "max_20x", "scale"):
        return True
    return "max" in p


def inject_conversational_form_runtime(
    html: str,
    form_schema: dict[str, Any] | None,
    app_public_url: str,
) -> str:
    if not form_schema or form_schema.get("display_mode") != "conversational":
        return html
    _ = app_public_url
    try:
        payload = json.dumps(form_schema, ensure_ascii=True)
    except (TypeError, ValueError):
        return html
    block = f'<script type="application/json" id="forge-form-schema">{payload}</script>\n'
    # Path served from the web app (Next `public/`) so embed + iframe share one asset.
    block += '<script src="/forge-conversational-form.js" defer data-forge="conversational"></script>\n'
    m = re.search(r"</body>", html, flags=re.IGNORECASE)
    if m:
        return html[: m.start()] + block + html[m.start() :]
    return html + block


def inject_custom_css_from_intent(
    html: str,
    intent_json: dict[str, Any] | None,
    org_plan: str | None,
) -> str:
    if not _proish_plan(org_plan) or not intent_json:
        return html
    raw = intent_json.get("custom_css")
    if not isinstance(raw, str) or not raw.strip():
        return html
    css = _sanitize_custom_css_block(raw)
    if not css:
        return html
    m = _HTML_RE.search(html)
    if m is not None and "forge-root" not in m.group(0).lower():
        open_tag = m.group(0)
        if re.search(r"\bclass\s*=\s*\"", open_tag, re.IGNORECASE):
            new_tag = re.sub(
                r'class\s*=\s*"([^"]*)"',
                lambda z: f'class="{z.group(1)} forge-root"',
                open_tag,
                count=1,
            )
        else:
            new_tag = re.sub(
                r"<html(\s|>)",
                r'<html class="forge-root"\1',
                open_tag,
                count=1,
            )
        html = html[: m.start()] + new_tag + html[m.end() :]
    # Authors scope rules with `.forge-root` (see docs). Sanitization only blocks exfil patterns.
    style = f'<style data-forge="custom-css" type="text/css">\n{css}\n</style>\n'
    m = re.search(r"</head>", html, flags=re.IGNORECASE)
    if m:
        return html[: m.start()] + style + html[m.start() :]
    return style + html


def inject_all_public_form_styles(
    html: str,
    *,
    form_schema: dict[str, Any] | None,
    intent_json: dict[str, Any] | None,
    app_public_url: str,
    org_plan: str | None,
) -> str:
    out = html
    out = inject_custom_css_from_intent(out, intent_json, org_plan)
    out = inject_conversational_form_runtime(out, form_schema, app_public_url)
    return out
