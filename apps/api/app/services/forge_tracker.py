"""Inject first-party analytics bootstrap into published HTML (Mission 06 / GL-01)."""

from __future__ import annotations

import json
from typing import Any

from app.config import settings


def _cfg_json(cfg: dict[str, Any]) -> str:
    return json.dumps(cfg, separators=(",", ":"), ensure_ascii=True)


def inject_forge_tracker(
    html: str,
    *,
    api_base: str,
    org_slug: str,
    page_slug: str,
    page_id: str,
    page_type: str,
    app_public_url: str | None = None,
) -> str:
    """Append tracker before ``</body>`` (stored HTML remains script-free)."""
    cfg = _cfg_json(
        {
            "apiBase": api_base.rstrip("/"),
            "org": org_slug,
            "page": page_slug,
            "pageId": page_id,
            "pageType": page_type,
        }
    )
    pub = (app_public_url or settings.APP_PUBLIC_URL).rstrip("/")
    snippet = (
        f"<script>window.__FORGE_TRACK_CONFIG__={cfg};</script>"
        f'<script src="{pub}/forge-track.js" defer></script>'
    )
    low = html.lower()
    idx = low.rfind("</body>")
    if idx == -1:
        return html + snippet
    return html[:idx] + snippet + html[idx:]
