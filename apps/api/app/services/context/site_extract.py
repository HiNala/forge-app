"""Lightweight site brand extraction without third-party APIs (Mission O-01).

Prefer Brand.dev / Firecrawl in production; this uses httpx + HTML meta fallbacks.
"""

from __future__ import annotations

import re
from typing import Any

import httpx

from app.services.context.models import ProductItem, SiteBrand, VoiceProfile

_UA = (
    "Mozilla/5.0 (compatible; ForgeBot/1.0; +https://forge.app; context-gather)"
)


async def fetch_html(url: str, *, timeout: float = 2.5) -> str | None:
    try:
        async with httpx.AsyncClient(
            headers={"User-Agent": _UA},
            follow_redirects=True,
            timeout=timeout,
        ) as client:
            r = await client.get(url)
            if r.status_code >= 400:
                return None
            return r.text[:500_000]
    except Exception:
        return None


def _meta(content: str, prop: str) -> str | None:
    m = re.search(
        rf'<meta[^>]+(?:property|name)=["\'](?:{prop}|og:{re.escape(prop)})["\'][^>]+content=["\']([^"\']+)["\']',
        content,
        re.I,
    )
    if m:
        return m.group(1).strip()
    m2 = re.search(
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:{prop}|og:{re.escape(prop)})["\']',
        content,
        re.I,
    )
    return m2.group(1).strip() if m2 else None


def _title(content: str) -> str | None:
    m = re.search(r"<title[^>]*>([^<]+)</title>", content, re.I)
    return m.group(1).strip() if m else None


async def extract_site_brand(url: str) -> SiteBrand | None:
    html = await fetch_html(url)
    if not html:
        return None
    name = _meta(html, "og:site_name") or _title(html)
    desc = _meta(html, "description") or _meta(html, "og:description")
    theme = _meta(html, "theme-color")
    logo = _meta(html, "og:image")
    return SiteBrand(
        url=url,
        business_name=name,
        tagline=desc,
        primary_color=theme,
        logo_url=logo,
        source="fetch_meta",
    )


async def extract_site_voice_stub(url: str) -> VoiceProfile | None:
    """Placeholder until LLM voice pass — returns minimal profile."""
    b = await extract_site_brand(url)
    if not b or not b.tagline:
        return VoiceProfile(persona_summary=f"Content from {url}", tone="warm")
    return VoiceProfile(
        persona_summary=(b.tagline or "")[:280],
        tone="warm",
    )


async def extract_site_products_stub(url: str) -> list[ProductItem]:
    html = await fetch_html(url, timeout=1.8)
    if not html:
        return []
    # naive: h2/h3 text as product candidates
    heads = re.findall(r"<h[23][^>]*>([^<]{3,80})</h[23]>", html, re.I)
    out: list[ProductItem] = []
    for h in heads[:8]:
        t = re.sub(r"\s+", " ", h).strip()
        if t:
            out.append(ProductItem(name=t))
    return out
