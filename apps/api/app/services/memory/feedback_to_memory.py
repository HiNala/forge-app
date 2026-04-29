"""Translate artifact feedback into durable design memory (BP-02)."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.artifact_feedback import ArtifactFeedback
from app.services.memory.service import upsert_design_memory

_DARK_RE = re.compile(r"\b(dark|darker|black|night)\b", re.I)
_PREMIUM_RE = re.compile(r"\b(premium|luxury|luxurious|high[- ]end|polished)\b", re.I)
_SIMPLE_RE = re.compile(r"\b(simple|simpler|minimal|less busy|cleaner)\b", re.I)
_REMOVE_RE = re.compile(r"\bremove\s+(?:the\s+)?([a-z0-9 _-]{3,40})", re.I)


def _source(feedback: ArtifactFeedback) -> dict[str, Any]:
    return {
        "feedback_id": str(feedback.id),
        "run_id": str(feedback.run_id),
        "artifact_kind": feedback.artifact_kind,
        "artifact_ref": feedback.artifact_ref,
        "action_taken": feedback.action_taken,
    }


def extract_memory_signals(feedback: ArtifactFeedback) -> list[tuple[str, str, dict[str, Any], float]]:
    reasons = {str(x) for x in (feedback.structured_reasons or [])}
    action = (feedback.action_taken or "").strip()
    text = (feedback.free_text or "").strip()
    blob = f"{action} {text}"
    signals: list[tuple[str, str, dict[str, Any], float]] = []

    if feedback.sentiment == "positive" and feedback.artifact_kind in {
        "screen",
        "page",
        "reasoning",
        "suggestion",
    }:
        ak = feedback.artifact_kind
        signals.append(("approved_pattern", f"artifact.{ak}", {"artifact_kind": ak}, 0.15))

    if "too_busy" in reasons or action == "less_busy" or _SIMPLE_RE.search(blob):
        signals.append(("style_preference", "density", {"preference": "less_busy"}, 0.2))

    if "wrong_style" in reasons or action == "more_premium" or _PREMIUM_RE.search(blob):
        premium_w = 0.25 if "wrong_style" in reasons else 0.2
        signals.append(("style_preference", "tone", {"preference": "premium"}, premium_w))
        signals.append(("rejected_pattern", "style.casual", {"avoid": "casual_or_generic_visual_tone"}, 0.1))

    if _DARK_RE.search(blob):
        signals.append(("style_preference", "color_temp", {"preference": "dark_warm"}, 0.15))

    if "wrong_density" in reasons:
        signals.append(("style_preference", "density", {"preference": "balanced"}, 0.12))

    if "missing_feature" in reasons:
        signals.append(
            (
                "workflow_preference",
                "feature_completeness",
                {"preference": "include_explicit_must_haves"},
                0.12,
            )
        )

    m = _REMOVE_RE.search(blob)
    if m:
        section = m.group(1).strip().replace(" ", "_")[:60]
        signals.append(("rejected_pattern", f"section.{section}", {"avoid_section": section}, 0.15))

    if "too_long" in reasons:
        signals.append(("style_preference", "copy_density", {"preference": "shorter_lines"}, 0.12))

    if (
        feedback.sentiment == "negative"
        and feedback.artifact_kind in {"screen", "page"}
        and reasons & {"wrong_style", "too_busy", "wrong_density"}
    ):
        signals.append(("rejected_pattern", "ui.last_negative", {"reasons": sorted(reasons)}, 0.08))

    if action.startswith("custom_refine") and text:
        signals.append(("workflow_preference", "custom_refine_language", {"last_signal": text[:500]}, 0.05))

    return signals


async def apply_feedback_to_memory(db: AsyncSession, feedback: ArtifactFeedback) -> list[dict[str, Any]]:
    writes: list[dict[str, Any]] = []
    for kind, key, value, strength_delta in extract_memory_signals(feedback):
        row = await upsert_design_memory(
            db,
            organization_id=feedback.organization_id,
            user_id=feedback.user_id,
            kind=kind,
            key=key,
            value=value,
            strength_delta=strength_delta,
            source=_source(feedback),
        )
        writes.append({"id": str(row.id), "kind": row.kind, "key": row.key, "strength": float(row.strength)})
    return writes
