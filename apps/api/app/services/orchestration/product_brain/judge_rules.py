"""Deterministic Judge — critics propose; judge decides (BP-01)."""

from __future__ import annotations

from app.services.orchestration.product_brain.schemas import CritiqueDimension, CritiqueReport, Fix, JudgeDecision


def _geom_mean(values: list[float]) -> float:
    if not values:
        return 7.0
    prod = 1.0
    for v in values:
        prod *= max(0.1, min(10.0, v))
    return float(prod ** (1.0 / len(values)))


def aggregate_overall(scores: dict[str, float]) -> float:
    vals = list(scores.values()) if scores else [7.0]
    return round(_geom_mean(vals), 2)


def decide_judge(
    *,
    critique: CritiqueReport,
    iterations: int,
    max_iterations: int,
) -> JudgeDecision:
    """Non-LLM termination policy."""
    dim_keys = [d.value for d in CritiqueDimension]
    score_map = {k: float(critique.scores.get(k, 7.0)) for k in dim_keys}
    overall = aggregate_overall({k: score_map[k] for k in dim_keys})
    critique.overall_score = overall

    code_q = score_map.get("code_quality", 7.0)
    a11y = score_map.get("accessibility", 7.0)
    security_bad = bool(critique.security_flags)

    # Forced refine when critical quality / security heuristic
    if code_q < 4 or a11y < 5 or security_bad:
        if iterations < max_iterations:
            dims = sorted(dim_keys, key=lambda d: score_map[d])[:3]
            return JudgeDecision(
                verdict="iterate",
                reason="Critical dimension below tolerance — targeted refine required.",
                target_dimensions=[CritiqueDimension(k) for k in dims],
                scoped_fixes=critique.recommended_fixes[:8],
                confidence=1.0,
            )
        return JudgeDecision(
            verdict="abort",
            reason="Quality floor failed after refinement cycles.",
            confidence=1.0,
        )

    if iterations >= max_iterations:
        degraded = overall < 8.5 or any(score_map[k] < 7 for k in dim_keys)
        return JudgeDecision(
            verdict="ship",
            reason="Iteration cap — shipping best effort.",
            confidence=0.75,
            degraded_quality_flag=degraded,
        )

    if overall >= 8.5 and all(score_map[k] >= 7.0 for k in dim_keys):
        return JudgeDecision(
            verdict="ship",
            reason="Quality bar met.",
            confidence=0.92,
            degraded_quality_flag=False,
        )

    if overall < 8.5 and iterations < max_iterations:
        worst = sorted(dim_keys, key=lambda d: score_map[d])[:3]
        worst_set = {CritiqueDimension(w) for w in worst}
        scoped: list[Fix] = [
            f for f in critique.recommended_fixes if f.dimension_target in worst_set
        ]
        return JudgeDecision(
            verdict="iterate",
            reason=f"Iterate on dimensions: {', '.join(worst)}.",
            target_dimensions=[CritiqueDimension(w) for w in worst],
            scoped_fixes=scoped or critique.recommended_fixes[:8],
            confidence=0.88,
        )

    return JudgeDecision(verdict="ship", reason="Default ship.", confidence=0.8, degraded_quality_flag=True)
