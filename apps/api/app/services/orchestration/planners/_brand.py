"""Brand tokens from org kit + site extraction."""

from __future__ import annotations

from app.services.context.models import ContextBundle
from app.services.orchestration.planning_models import BrandTokens


def brand_tokens_from_bundle(bundle: ContextBundle | None) -> BrandTokens:
    if bundle is None or bundle.brand_kit is None:
        return BrandTokens()
    bk = bundle.brand_kit
    primary = str(bk.get("primary_color") or "#2563EB")
    secondary = str(bk.get("secondary_color") or "#0F172A")
    return BrandTokens(
        primary=primary,
        secondary=secondary,
        display_font=bk.get("display_font"),
        body_font=bk.get("body_font"),
    )
