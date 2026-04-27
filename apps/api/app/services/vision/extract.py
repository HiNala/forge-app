"""Vision feature extraction — async jobs extend this (V2 P-05)."""

from __future__ import annotations

from typing import Any

def stub_extract_from_kind(kind: str, mime_type: str) -> dict[str, Any]:
    """Placeholder until arq job runs GPT-4o / Gemini vision."""
    return {
        "dominant_colors": [] if "pdf" in mime_type else ["#0F172A", "#14B8A6"],
        "style_guess": "clean product UI" if "image" in mime_type else "document",
        "ocr_text": None,
    }


_KINDS = frozenset(
    {"screenshot", "brand_board", "sketch", "reference_design", "pdf_page", "photo"},
)


def vision_input_from_row(
    storage_key: str,
    kind: str,
    mime: str,
    w: int | None,
    h: int | None,
    desc: str | None,
    feats: dict[str, Any] | None,
) -> "VisionInput":
    from app.services.context.models import VisionInput

    k = kind if kind in _KINDS else "screenshot"
    return VisionInput(
        kind=k,  # type: ignore[arg-type]
        storage_key=storage_key,
        mime_type=mime,
        width=int(w or 0),
        height=int(h or 0),
        description=desc,
        extracted_features=feats,
    )
