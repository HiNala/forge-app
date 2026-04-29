"""Product Orchestrator stream — BP-01 coordinator over legacy HTML pipeline."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.deps.tenant import TenantContext
from app.services.billing.credits import compute_studio_pipeline_credits
from app.services.orchestration.legacy_pipeline import (
    complete_studio_prep_from_gathered,
    gather_studio_context_bundle,
    stream_studio_page_generation_tail,
)
from app.services.orchestration.product_brain import metrics as pb_metrics
from app.services.orchestration.product_brain.agent_runners import (
    run_code_agent,
    run_critic_agent,
    run_design_system_agent,
    run_flow_agent,
    run_intent_agent,
    run_memory_agent,
    run_refiner_agent,
    run_strategy_agent,
    run_system_agent,
    run_ui_agent,
)
from app.services.orchestration.product_brain.graph_engine import parallel_all
from app.services.orchestration.product_brain.intent_bridge import intent_spec_to_page_intent
from app.services.orchestration.product_brain.judge_rules import decide_judge
from app.services.orchestration.product_brain.schemas import (
    FourLayerOutput,
    OrchestratorState,
    ProductStrategy,
    RunBudget,
    UXFlow,
)

logger = logging.getLogger(__name__)


def _sse(event: str, payload: dict[str, Any]) -> bytes:
    return f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n".encode()


def _phase(agent: str, label: str, **extra: Any) -> bytes:
    payload: dict[str, Any] = {"agent": agent, "label": label, **extra}
    return _sse("orchestration.phase", payload)


_MAX_PROVISIONAL_CREDIT_EMITS = 16


def _provisional_credit_chunk(shadow: dict[str, int], *, agent: str) -> bytes | None:
    """BP-04 — SSE only; ledger settles in legacy_pipeline at html completion."""
    cap = int(shadow.get("cap") or 0)
    if cap <= 0:
        return None
    emit = int(shadow.get("emit") or 0) + 1
    shadow["emit"] = emit
    prev = int(shadow.get("prev") or 0)
    if emit >= _MAX_PROVISIONAL_CREDIT_EMITS:
        target = cap
    else:
        target = min(cap, (emit * cap + _MAX_PROVISIONAL_CREDIT_EMITS - 1) // _MAX_PROVISIONAL_CREDIT_EMITS)
    delta = max(0, target - prev)
    if delta <= 0:
        return None
    shadow["prev"] = prev + delta
    return _sse(
        "credit.charged",
        {
            "amount_credits": delta,
            "agent": agent,
            "running_total": shadow["prev"],
            "provisional": True,
        },
    )


def _credit_shadow_flush(shadow: dict[str, int], *, agent: str) -> bytes | None:
    cap = int(shadow.get("cap") or 0)
    if cap <= 0:
        return None
    prev = int(shadow.get("prev") or 0)
    if prev >= cap:
        return None
    delta = cap - prev
    shadow["prev"] = cap
    shadow["emit"] = max(int(shadow.get("emit") or 0), _MAX_PROVISIONAL_CREDIT_EMITS)
    return _sse(
        "credit.charged",
        {
            "amount_credits": delta,
            "agent": agent,
            "running_total": cap,
            "provisional": True,
        },
    )


def _simple_prompt(prompt: str, has_vision: bool) -> bool:
    return len(prompt) < 120 and not has_vision and "\n" not in prompt[:200]


def _budget_ok(state: OrchestratorState, wall_deadline: float) -> bool:
    if len(state.agent_calls) >= 14:
        state.terminated_reason = state.terminated_reason or "agent_cap"
        return False
    if time.perf_counter() >= wall_deadline:
        state.terminated_reason = state.terminated_reason or "wall_time"
        return False
    if state.budget.spent_cost_cents >= state.budget.max_cost_cents:
        state.cost_constrained = True
        state.terminated_reason = state.terminated_reason or "cost_cap"
        return False
    return True


def _build_four_layers(state: OrchestratorState) -> FourLayerOutput:
    spec_obj: dict[str, Any] = {}
    if state.ui_tree:
        spec_obj["component_tree"] = state.ui_tree
    if state.system_spec:
        spec_obj["system_spec"] = state.system_spec.model_dump(mode="json")
    if state.design_tokens:
        spec_obj["design_tokens"] = state.design_tokens.model_dump(mode="json")
    code_obj: dict[str, Any] = {}
    if state.code_artifacts:
        code_obj = state.code_artifacts.model_dump(mode="json")
    bullets = state.suggestion_bullets or [
        "Tighten mobile spacing on long forms.",
        "Add one more explicit trust signal near the CTA.",
        "Swap placeholder imagery for real brand photography when available.",
    ]
    return FourLayerOutput(
        layer1_reasoning=state.reasoning_text,
        layer2_design_spec_json=spec_obj,
        layer3_code=code_obj,
        layer4_suggestions=bullets,
    )


async def stream_product_page_generation(
    *,
    db: AsyncSession,
    ctx: TenantContext,
    user: User,
    prompt: str,
    provider: str | None,
    existing_page_id: UUID | None,
    forced_workflow: str | None = None,
    vision_attachment_ids: list[UUID] | None = None,
    ignore_memory: bool = False,
) -> AsyncIterator[bytes]:
    """Gather → BP-01 graph → compose/persist tail (GlideDesign HTML output)."""
    run_bp = uuid4()
    orch = OrchestratorState(
        run_id=run_bp,
        org_id=ctx.organization_id,
        user_id=user.id,
        prompt=prompt,
        attachments=[],
        budget=RunBudget(
            max_wall_time_seconds=60.0,
            max_cost_cents=40,
        ),
    )
    wall_deadline = time.perf_counter() + orch.budget.max_wall_time_seconds

    gathered = await gather_studio_context_bundle(
        db=db,
        ctx=ctx,
        user=user,
        prompt=prompt,
        vision_attachment_ids=vision_attachment_ids,
    )
    if gathered is None:
        yield _sse("error", {"code": "not_found", "message": "Organization not found"})
        return
    replay, org_row, bundle, brand_hint, brand_snapshot, primary, secondary = gathered
    for chunk in replay:
        yield chunk

    has_vision = bool(bundle.vision_inputs)
    simple = _simple_prompt(prompt, has_vision)

    try:
        yield _phase("intent", "Understanding what to build…")
        await run_intent_agent(state=orch, db=db, provider=provider)
        pb_metrics.observe_agent("intent", ok=True)
        if orch.intent and orch.intent.confidence < 0.65:
            yield _sse(
                "clarify",
                {
                    "candidates": [
                        {
                            "workflow": orch.intent.workflow_classification,
                            "confidence": orch.intent.confidence,
                            "rationale": "Product brain picked the strongest interpretation.",
                        },
                    ],
                    "non_blocking": True,
                    "source": "product_brain",
                },
            )
        if not _budget_ok(orch, wall_deadline):
            raise RuntimeError(orch.terminated_reason or "budget")

        assert orch.intent is not None
        pit_credit = intent_spec_to_page_intent(prompt, orch.intent)
        credit_shadow: dict[str, int] = {
            "cap": compute_studio_pipeline_credits(
                pit_credit,
                refining_existing_page=existing_page_id is not None,
            ),
            "prev": 0,
            "emit": 0,
        }
        _cz = _provisional_credit_chunk(credit_shadow, agent="intent")
        if _cz is not None:
            yield _cz

        if simple:
            orch.product_strategy = ProductStrategy(
                target_customer=orch.intent.target_user,
                primary_pain_point="Clarity and speed",
                user_promise=orch.intent.primary_goal,
                core_loop="See value → act → confirm",
            )
            orch.ux_flow = UXFlow()
            yield _phase("design_system", "Choosing tokens and typography…")
            await run_design_system_agent(state=orch, db=db, provider=provider)
            _cz = _provisional_credit_chunk(credit_shadow, agent="design_system")
            if _cz is not None:
                yield _cz
            yield _phase("system", "Mapping screens to behavior and data…")
            await run_system_agent(state=orch, db=db, provider=provider)
            _cz = _provisional_credit_chunk(credit_shadow, agent="system")
            if _cz is not None:
                yield _cz
        else:
            yield _phase("strategy", "Thinking through the product loop…")
            await run_strategy_agent(state=orch, db=db, provider=provider)
            _cz = _provisional_credit_chunk(credit_shadow, agent="strategy")
            if _cz is not None:
                yield _cz
            if not _budget_ok(orch, wall_deadline):
                raise RuntimeError(orch.terminated_reason or "budget")

            yield _phase("flow", "Mapping the user journey…")
            yield _phase("design_system", "Choosing tokens and typography…")

            async def _flow(_state: OrchestratorState) -> None:
                await run_flow_agent(state=orch, db=db, provider=provider)

            async def _ds(_state: OrchestratorState) -> None:
                await run_design_system_agent(state=orch, db=db, provider=provider)

            await parallel_all(
                runners=(
                    ("flow", _flow),
                    ("design_system", _ds),
                ),
                state=orch,
            )
            _cz = _provisional_credit_chunk(credit_shadow, agent="flow")
            if _cz is not None:
                yield _cz
            yield _phase("system", "Mapping screens to behavior and data…")
            await run_system_agent(state=orch, db=db, provider=provider)
            _cz = _provisional_credit_chunk(credit_shadow, agent="system")
            if _cz is not None:
                yield _cz

        yield _phase("ui", "Structuring the screen tree…")
        await run_ui_agent(state=orch, db=db, provider=provider)
        _cz = _provisional_credit_chunk(credit_shadow, agent="ui")
        if _cz is not None:
            yield _cz
        yield _phase("code", "Preparing exportable code scaffolding…")
        await run_code_agent(state=orch, db=db, provider=provider)
        _cz = _provisional_credit_chunk(credit_shadow, agent="code")
        if _cz is not None:
            yield _cz

        while orch.iterations <= orch.max_iterations:
            yield _phase("critic", "Reviewing quality across dimensions…")
            await run_critic_agent(state=orch, db=db, provider=provider)
            _cz = _provisional_credit_chunk(credit_shadow, agent="critic")
            if _cz is not None:
                yield _cz
            assert orch.critique is not None
            jd = decide_judge(critique=orch.critique, iterations=orch.iterations, max_iterations=orch.max_iterations)
            orch.judge_decision = jd
            yield _sse(
                "orchestration.judge",
                {"verdict": jd.verdict, "reason": jd.reason, "quality": orch.critique.overall_score},
            )
            if jd.verdict == "ship" or jd.verdict == "abort":
                orch.degraded_quality_note = bool(jd.degraded_quality_flag)
                break
            if jd.verdict == "iterate":
                orch.iterations += 1
                yield _phase("refiner", "Applying targeted improvements…")
                await run_refiner_agent(state=orch, db=db, provider=provider)
                _cz = _provisional_credit_chunk(credit_shadow, agent="refiner")
                if _cz is not None:
                    yield _cz
            if orch.iterations > orch.max_iterations:
                break

        _czf = _credit_shadow_flush(credit_shadow, agent="orchestration")
        if _czf is not None:
            yield _czf

        # Layer 1 narrative
        assert orch.intent is not None and orch.product_strategy is not None
        orch.reasoning_text = (
            f"{orch.product_strategy.user_promise} — built for {orch.product_strategy.target_customer}. "
            f"Core loop: {orch.product_strategy.core_loop}. "
            f"Intent: {orch.intent.app_type} ({orch.intent.workflow_classification})."
        )
        four = _build_four_layers(orch)

        page_intent = intent_spec_to_page_intent(prompt, orch.intent)
        node_timings_b: dict[str, int] = {}
        for c in orch.agent_calls:
            node_timings_b[f"bp01_{c.agent_name}"] = c.latency_ms

        prep_replay, prep_state = await complete_studio_prep_from_gathered(
            db=db,
            ctx=ctx,
            user=user,
            prompt=prompt,
            provider=provider,
            existing_page_id=existing_page_id,
            forced_workflow=forced_workflow,
            replay=[],  # don't duplicate context events
            org_row=org_row,
            bundle=bundle,
            brand_hint=brand_hint,
            brand_snapshot=brand_snapshot,
            primary=primary,
            secondary=secondary,
            page_intent_override=page_intent,
            run_id=run_bp,
            node_timings=node_timings_b,
        )
        if prep_state is None:
            yield _sse("error", {"code": "prepare_failed", "message": "Could not prepare pipeline"})
            return
        prep_state.run_id = run_bp
        prep_state.product_brain_trace = [c.model_dump(mode="json") for c in orch.agent_calls]
        prep_state.four_layer_output = four.model_dump(mode="json")

        for chunk in prep_replay:
            yield chunk

        yield _sse(
            "orchestration.four_layer",
            prep_state.four_layer_output,
        )

        if not ignore_memory and orch.judge_decision and orch.judge_decision.verdict == "ship":
            await run_memory_agent(state=orch, db=db, run_id=run_bp)

        async for chunk in stream_studio_page_generation_tail(prep_state):
            yield chunk
    except Exception as e:
        logger.exception("product_brain_fail %s", e)
        yield _sse("error", {"code": "orchestration_failed", "message": str(e)[:240]})
