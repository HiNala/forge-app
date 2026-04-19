"""Inject tasteful 'Made with Forge' badge for Starter / trial orgs."""

from __future__ import annotations

import hashlib
import re
from urllib.parse import quote


def _anon_ref(page_id: str) -> str:
    return hashlib.sha256(f"forge-badge:{page_id}".encode()).hexdigest()[:12]


def inject_made_with_forge_badge(html: str, *, show: bool, page_id: str, forge_site_base: str) -> str:
    """Appends a small fixed-position pill before </body>, or at end of fragment."""
    if not show or not html.strip():
        return html
    if "data-forge-made-with" in html:
        return html

    ref = _anon_ref(page_id)
    base = forge_site_base.rstrip("/")
    href = f"{base}/?ref=page&via={quote(ref)}"

    badge = (
        f'<div data-forge-made-with="1" style="position:fixed;right:10px;bottom:10px;'
        f'z-index:9999;font-family:system-ui,sans-serif;">'
        f'<a href="{href}" target="_blank" rel="noopener noreferrer" '
        'style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;'
        "border-radius:999px;font-size:11px;font-weight:600;text-decoration:none;"
        "background:rgba(15,23,42,0.78);color:#f8fafc;border:1px solid rgba(148,163,184,0.35);"
        'box-shadow:0 2px 8px rgba(0,0,0,0.15);">'
        f'<span aria-hidden="true" style="opacity:0.9">✶</span> Made with Forge'
        f"</a></div>"
    )

    m = re.search(r"(?i)</body\s*>", html)
    if m:
        i = m.start()
        return html[:i] + badge + html[i:]
    return html + badge


def forge_branding_visible_for_plan(plan: str | None) -> bool:
    p = (plan or "trial").lower().strip()
    return p in ("trial", "starter")
