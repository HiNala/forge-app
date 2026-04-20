"""Brand drift (deterministic) + voice drift (LLM) — O-04."""

from __future__ import annotations

import re
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.exceptions import LLMConfigurationError
from app.services.llm.llm_router import structured_completion
from app.services.orchestration.planning_models import BrandTokens
from app.services.orchestration.review.models import Finding, VoiceDriftResult

_HEX = re.compile(r"#[0-9a-fA-F]{6}\b")


def _norm_hex(h: str) -> str:
    return h.strip().lower()


def _brand_findings_for_html(html: str, brand: BrandTokens) -> list[Finding]:
    allowed = {
        _norm_hex(brand.primary),
        _norm_hex(brand.secondary),
    }
    found = {_norm_hex(m) for m in _HEX.findall(html)}
    stray = [c for c in found if c not in allowed and c not in ("#ffffff", "#000000", "#f8fafc", "#0f172a")]
    out: list[Finding] = []
    for c in sorted(stray)[:8]:
        out.append(
            Finding(
                expert="Brand Consistency",
                severity="minor",
                section_ref=None,
                dimension="brand_color_drift",
                message=f"Hardcoded color {c} appears in output — prefer brand tokens.",
                specific_quote=c,
                suggested_action="Re-render from ComponentTree with brand tokens only.",
                auto_fixable=True,
                confidence=0.99,
            )
        )
    return out


class _VoiceScoreSchema(BaseModel):
    voice_score: int = Field(default=85, ge=0, le=100)
    drift_examples: list[str] = Field(default_factory=list)
    summary: str = ""


async def voice_drift_check(
    *,
    prose_sample: str,
    voice_summary: str,
    provider: str | None,
    db: AsyncSession | None,
    organization_id: UUID | None,
) -> VoiceDriftResult:
    if len(prose_sample.strip()) < 40:
        return VoiceDriftResult(voice_score=90, drift_examples=[], summary="Not enough prose to score.")
    system = (
        "You compare marketing copy to a voice profile. Return JSON only. "
        "Score 0-100 how well the prose matches the described voice. "
        "List up to 3 short drift examples when score < 80."
    )
    user = f"Voice profile:\n{voice_summary}\n\nProse sample:\n{prose_sample[:3500]}"
    try:
        r = await structured_completion(
            role="intent_parser",
            schema=_VoiceScoreSchema,
            system_prompt=system,
            user_prompt=user,
            provider=provider,
            db=db,
            organization_id=organization_id,
        )
        return VoiceDriftResult(
            voice_score=r.voice_score,
            drift_examples=r.drift_examples[:3],
            summary=r.summary[:500],
        )
    except (LLMConfigurationError, Exception):
        return VoiceDriftResult(voice_score=90, drift_examples=[], summary="Voice check skipped.")


def voice_finding_from_result(v: VoiceDriftResult) -> Finding | None:
    if v.voice_score >= 70:
        return None
    return Finding(
        expert="Voice Consistency",
        severity="major",
        section_ref=None,
        dimension="voice_match",
        message=f"Composed copy may not match the voice profile (score {v.voice_score}).",
        specific_quote="; ".join(v.drift_examples[:2]) if v.drift_examples else None,
        suggested_action="Tighten hero and body copy to match tone and formality in the voice profile.",
        auto_fixable=False,
        confidence=0.75,
    )
