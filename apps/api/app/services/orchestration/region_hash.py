"""Region drift detection — hash elements outside a region (V2 P-05)."""

from __future__ import annotations

import hashlib
import re
from typing import Any

from app.services.orchestration.scope import BoundingBox


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip())


def hash_outside_region(
    html: str,
    *,
    region: BoundingBox | None,
    element_ids_in_region: list[str],
) -> dict[str, str]:
    """
    Build a fingerprint dict element_id -> sha256 for components *outside* the edit region.
    When region is None, hashes top-level section roots by data-forge-section.
    """
    if not html.strip():
        return {}
    # Heuristic: split on data-forge-section or data-forge-element id
    chunks: dict[str, str] = {}
    for m in re.finditer(
        r'data-forge-(?:section|element)="([^"]+)"',
        html,
    ):
        eid = m.group(1)
        if eid in element_ids_in_region:
            continue
        start = m.start()
        # rough: take next 12k chars as subtree proxy
        frag = html[start : start + 12_000]
        chunks[eid] = hashlib.sha256(_norm(frag).encode()).hexdigest()
    return chunks


def detect_drift(
    before: dict[str, str],
    after: dict[str, str],
) -> list[str]:
    """Return element ids whose hash changed (unexpected drift)."""
    out: list[str] = []
    for eid, h0 in before.items():
        h1 = after.get(eid)
        if h1 is not None and h1 != h0:
            out.append(eid)
    return out


def merge_extracted_features(features: list[dict[str, Any] | None]) -> dict[str, Any]:
    """Merge vision feature dicts (dominant colors, etc.) for prompt context."""
    colors: list[str] = []
    for f in features:
        if not f:
            continue
        for c in f.get("dominant_colors") or []:
            if isinstance(c, str) and c not in colors:
                colors.append(c)
    return {"dominant_colors": colors[:8]}
