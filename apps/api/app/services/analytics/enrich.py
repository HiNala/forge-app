"""Server-side enrichment for analytics rows (UA, geo hints, referrer)."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from fastapi import Request


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "0.0.0.0"


def _parse_ua(ua: str | None) -> tuple[str | None, str | None, str | None]:
    if not ua:
        return None, None, None
    try:
        from user_agents import parse

        p = parse(ua[:4000])
        browser = f"{p.browser.family} {p.browser.version_string}".strip()
        os_s = f"{p.os.family} {p.os.version_string}".strip()
        dev = p.device.model or None
        return browser or None, os_s or None, dev
    except Exception:
        return None, None, None


def referrer_hostname(referrer: str | None) -> str | None:
    if not referrer:
        return None
    try:
        return urlparse(referrer).hostname
    except Exception:
        return None


def country_hint(request: Request) -> str | None:
    return (
        request.headers.get("cf-ipcountry")
        or request.headers.get("x-country-code")
        or request.headers.get("cloudfront-viewer-country")
    )


def enrich_from_request(request: Request, metadata: dict[str, Any]) -> dict[str, Any]:
    """Merge UTM / locale hints from client metadata + server headers."""
    ua = request.headers.get("user-agent")
    browser, os_s, device_model = _parse_ua(ua)
    out = {
        "browser": browser,
        "os": os_s,
        "device_model": device_model,
        "country_code": country_hint(request),
        "locale": request.headers.get("accept-language", "").split(",")[0].strip() or None,
    }
    # Client may pass viewport in metadata
    for k in ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "timezone"):
        if k in metadata and metadata[k] is not None:
            out[k] = metadata[k]
    return out
