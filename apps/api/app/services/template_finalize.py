"""Apply org brand and routing placeholders to curated template HTML."""

from __future__ import annotations

import re

# Default palette used in seed templates (swap for org brand kit).
DEFAULT_TEMPLATE_PRIMARY = "#2563EB"
DEFAULT_TEMPLATE_SECONDARY = "#64748B"

_PLACEHOLDER_ORG = "__ORG_SLUG__"
_PLACEHOLDER_PAGE = "__PAGE_SLUG__"


def finalize_template_html(
    html: str,
    *,
    org_slug: str,
    page_slug: str,
    title: str,
    primary: str,
    secondary: str,
) -> str:
    """Replace shell tokens and form action path segments."""
    out = (
        html.replace(_PLACEHOLDER_ORG, org_slug)
        .replace(_PLACEHOLDER_PAGE, page_slug)
        .replace("$title", title)
        .replace("$primary", primary)
        .replace("$secondary", secondary)
    )
    out = out.replace(DEFAULT_TEMPLATE_PRIMARY, primary).replace(
        DEFAULT_TEMPLATE_SECONDARY, secondary
    )
    # Legacy absolute paths if any template used a generic placeholder.
    out = re.sub(
        r"/p/[^/]+/[^/]+/submit",
        f"/p/{org_slug}/{page_slug}/submit",
        out,
    )
    return out


def brand_kit_snapshot_dict(
    *,
    primary: str,
    secondary: str,
    logo_url: str | None,
    display_font: str | None,
    body_font: str | None,
) -> dict[str, str | None]:
    return {
        "primary_color": primary,
        "secondary_color": secondary,
        "logo_url": logo_url,
        "display_font": display_font,
        "body_font": body_font,
    }
