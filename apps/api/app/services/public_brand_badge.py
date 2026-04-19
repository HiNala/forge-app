"""Optional “Made with Forge” link on public live pages (plan-gated)."""

from __future__ import annotations


def forge_branding_visible_for_plan(plan: str | None) -> bool:
    """Trial and starter orgs show Forge attribution; paid tiers can hide it."""
    if plan is None:
        return True
    return plan in ("trial", "starter")


def inject_made_with_forge_badge(
    html: str,
    *,
    show: bool,
    page_id: str,
    forge_site_base: str,
) -> str:
    if not show or not forge_site_base.strip():
        return html
    base = forge_site_base.rstrip("/")
    link = (
        f'<p class="forge-public-badge" data-forge-badge="1" '
        f'style="text-align:center;font-size:12px;opacity:0.75;margin:1.5rem 0;">'
        f'<a href="{base}/?ref=public-{page_id}" rel="noopener noreferrer">Made with Forge</a>'
        f"</p>"
    )
    lowered = html.lower()
    if "</body>" in lowered:
        idx = lowered.rfind("</body>")
        return html[:idx] + link + html[idx:]
    return html + link
