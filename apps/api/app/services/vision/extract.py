"""Vision feature extraction — async jobs extend this (V2 P-05)."""

from __future__ import annotations

from typing import Any

from app.services.context.models import VisionInput


def stub_extract_from_kind(kind: str, mime_type: str) -> dict[str, Any]:
    """Best-effort structured metadata until async vision jobs hydrate attachments."""

    base_colors = ["#0F172A", "#14B8A6", "#64748B", "#F8FAFC", "#FB923C"]
    return {
        "dominant_colors": [] if "pdf" in mime_type else base_colors,
        "style_guess": "structured product UI" if "image" in mime_type else "document typography",
        "layout_summary": (
            "Auto layout inferred from raster/PDF mime — replace with GPT-4o vision + pixel clustering."
            if not mime_type.startswith("image/")
            else "Vision clustering pending async worker enqueue."
        ),
        "ocr_text": None,
        "inspiration_only_notice": (
            "Treat attachments as inspiration—never transcribe copyrighted marks verbatim."
        ),
    }


async def extract_image_features_async(kind: str, mime_type: str) -> dict[str, Any]:
    """Async entry for gather + workers; wraps the stub until real vision models run inline."""
    return stub_extract_from_kind(kind, mime_type)


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
) -> VisionInput:
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
