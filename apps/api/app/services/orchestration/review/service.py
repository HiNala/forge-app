"""Orchestrate expert LLM review + deterministic checks (O-04)."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any, cast
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.exceptions import LLMConfigurationError
from app.services.llm.composer_prompts import load_reviewer_prompt
from app.services.llm.llm_router import structured_completion
from app.services.orchestration.component_lib.schema import ProposalComponentTree
from app.services.orchestration.models import PageIntent
from app.services.orchestration.planning_models import PagePlan
from app.services.orchestration.review.a11y_checks import run_a11y_checks
from app.services.orchestration.review.brand_voice import (
    _brand_findings_for_html,
    voice_drift_check,
    voice_finding_from_result,
)
from app.services.orchestration.review.metrics import record_review_metrics
from app.services.orchestration.review.models import Finding, ReviewReport, Severity, VoiceDriftResult
from app.services.orchestration.review.workflow_checks import (
    deck_completeness_checks,
    form_integrity_checks,
    proposal_structural_checks,
)
from app.services.orchestration.review.workflow_weights import weights_for_workflow, weights_table_markdown

logger = logging.getLogger(__name__)

_REVIEW_TIMEOUT = 20.0
_VOICE_TIMEOUT = 12.0


def _strip_html(html: str) -> str:
    t = re.sub(r"<script[^>]*>[\s\S]*?</script>", " ", html, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()[:8000]


def _bump_severity(
    sev: str,
    expert: str,
    weights: dict[str, float],
) -> str:
    w = weights.get(expert, 1.0)
    order = ["suggestion", "minor", "major", "critical"]
    if w >= 1.35 and sev in ("suggestion", "minor", "major"):
        i = order.index(sev)
        return order[min(i + 1, len(order) - 1)]
    return sev


def merge_and_weight(findings: list[Finding], workflow: str | None) -> list[Finding]:
    weights = weights_for_workflow(workflow)
    out: list[Finding] = []
    for f in findings:
        ns = _bump_severity(f.severity, f.expert, weights)
        if ns != f.severity:
            out.append(f.model_copy(update={"severity": cast(Severity, ns)}))
        else:
            out.append(f)
    return out


async def _llm_review(
    *,
    tree: dict[str, Any] | None,
    page_plan: PagePlan,
    intent: PageIntent,
    user_prompt: str,
    provider: str | None,
    db: AsyncSession | None,
    organization_id: UUID | None,
) -> ReviewReport:
    tpl = load_reviewer_prompt()
    if not tpl.strip():
        return ReviewReport(findings=[], overall_quality_score=88, summary="Review prompt missing.")
    voice = page_plan.voice_profile
    voice_summary = f"{voice.tone} / {voice.formality}: {voice.persona_summary}"
    brand = page_plan.brand_tokens
    brand_summary = json.dumps(
        {"primary": brand.primary, "secondary": brand.secondary, "display_font": brand.display_font},
        default=str,
    )
    plan_summary = json.dumps(
        [{"id": s.id, "role": s.role, "brief": s.content_brief[:200]} for s in page_plan.sections[:24]],
        default=str,
    )[:6000]
    weights = weights_for_workflow(intent.workflow)
    weights_md = weights_table_markdown(weights)
    system = tpl.replace("{{ workflow }}", intent.workflow or "").replace(
        "{{ voice_summary }}", voice_summary[:2000]
    ).replace("{{ brand_summary }}", brand_summary).replace("{{ user_prompt }}", user_prompt[:4000]).replace(
        "{{ plan_summary }}", plan_summary
    ).replace("{{ weights_table }}", weights_md)
    user = json.dumps(tree or {}, indent=2, default=str)[:100_000]
    try:
        return await structured_completion(
            role="reviewer",
            schema=ReviewReport,
            system_prompt=system,
            user_prompt=user,
            provider=provider,
            db=db,
            organization_id=organization_id,
        )
    except Exception as e:
        logger.warning("review_llm_failed %s", e)
        return ReviewReport(findings=[], overall_quality_score=88, summary="Review skipped (LLM error).")


async def run_full_review(
    *,
    component_tree: dict[str, Any] | None,
    html: str,
    page_plan: PagePlan,
    intent: PageIntent,
    user_prompt: str,
    provider: str | None,
    db: AsyncSession | None,
    organization_id: UUID | None,
    proposal_tree: ProposalComponentTree | None,
    booking_enabled: bool,
) -> tuple[ReviewReport, VoiceDriftResult, list[Finding]]:
    t0 = time.perf_counter()
    det: list[Finding] = []
    det.extend(proposal_structural_checks(proposal_tree))
    det.extend(form_integrity_checks(html, intent.page_type, booking_enabled))
    det.extend(deck_completeness_checks(html, intent.page_type))
    det.extend(run_a11y_checks(html))
    det.extend(_brand_findings_for_html(html, page_plan.brand_tokens))

    async def _voice() -> VoiceDriftResult:
        sample = _strip_html(html)
        vs = page_plan.voice_profile.persona_summary or "Professional, clear"
        return await voice_drift_check(
            prose_sample=sample,
            voice_summary=vs,
            provider=provider,
            db=db,
            organization_id=organization_id,
        )

    async def _run_llm() -> ReviewReport:
        return await _llm_review(
            tree=component_tree,
            page_plan=page_plan,
            intent=intent,
            user_prompt=user_prompt,
            provider=provider,
            db=db,
            organization_id=organization_id,
        )

    llm_report: ReviewReport | None = None
    voice_res: VoiceDriftResult | None = None
    try:
        results = await asyncio.gather(
            asyncio.wait_for(_run_llm(), timeout=_REVIEW_TIMEOUT),
            asyncio.wait_for(_voice(), timeout=_VOICE_TIMEOUT),
            return_exceptions=True,
        )
        lr, vr = results[0], results[1]
        if isinstance(lr, Exception):
            logger.warning("review_llm_task %s", lr)
            llm_report = ReviewReport(findings=[], overall_quality_score=88, summary="Review timed out or failed.")
        else:
            llm_report = cast(ReviewReport, lr)
        if isinstance(vr, Exception):
            voice_res = VoiceDriftResult(voice_score=90, drift_examples=[], summary="Voice check skipped.")
        else:
            voice_res = cast(VoiceDriftResult, vr)
    except LLMConfigurationError:
        llm_report = ReviewReport(findings=[], overall_quality_score=88, summary="No LLM keys.")
        voice_res = VoiceDriftResult(voice_score=90, drift_examples=[], summary="Voice check skipped.")
    except Exception as e:
        logger.warning("review_parallel_failed %s", e)
        llm_report = ReviewReport(findings=[], overall_quality_score=88, summary="Review skipped.")
        voice_res = VoiceDriftResult(voice_score=90, drift_examples=[], summary="Voice check skipped.")

    if llm_report is None:
        llm_report = ReviewReport(findings=[], overall_quality_score=88, summary="")
    if voice_res is None:
        voice_res = VoiceDriftResult(voice_score=90, drift_examples=[], summary="")

    vf = voice_finding_from_result(voice_res)
    if vf is not None:
        det.append(vf)

    merged = merge_and_weight([*llm_report.findings, *det], intent.workflow)
    summary = llm_report.summary
    score = llm_report.overall_quality_score
    if voice_res.voice_score < 70:
        score = min(score, voice_res.voice_score + 5)

    report = ReviewReport(findings=merged, overall_quality_score=max(0, min(100, score)), summary=summary)

    latency_ms = int((time.perf_counter() - t0) * 1000)
    counts: dict[str, int] = {}
    for f in merged:
        counts[f.severity] = counts.get(f.severity, 0) + 1
    record_review_metrics(
        finding_counts=counts,
        quality_score=report.overall_quality_score,
        iteration=0,
        auto_fix_attempted=False,
        auto_fix_resolved=None,
        latency_ms=latency_ms,
        cost_cents=None,
    )

    return report, voice_res, merged
