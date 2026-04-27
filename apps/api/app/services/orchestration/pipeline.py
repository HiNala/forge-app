"""Studio generation pipeline — SSE-friendly orchestration."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, cast
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import BrandKit, Organization, Page, PageRevision, User
from app.deps.tenant import TenantContext
from app.services.ai.usage import increment_pages_generated
from app.services.billing.credit_windows import apply_rolling_resets_in_memory
from app.services.billing.credits import (
    apply_charge,
    compute_studio_pipeline_credits,
    credits_usage_dict,
    studio_credit_charge_spec,
)
from app.services.context.gather import gather_context
from app.services.context.models import ContextBundle
from app.services.deck_service import finalize_deck_studio_html
from app.services.orchestration.component_lib.render import render_top_level_component
from app.services.orchestration.component_lib.schema import ProposalComponentTree
from app.services.orchestration.forced_workflow import apply_forced_workflow
from app.services.orchestration.html_validate import validate_compose_graph, validate_generated_html
from app.services.orchestration.intent_parser import parse_intent
from app.services.orchestration.models import PageIntent
from app.services.orchestration.orchestration_recorder import record_run
from app.services.orchestration.page_composer import (
    apply_plan_constraints,
    assemble_html,
    default_assembly_plan,
    render_section,
)
from app.services.orchestration.plan_to_assembly import build_assembly_from_intent
from app.services.orchestration.review.refine import refine_component_tree_from_findings
from app.services.orchestration.review.service import run_full_review
from app.services.proposal_service import finalize_proposal_studio_html
from app.utils.slug import slugify_page_title, unique_page_slug

logger = logging.getLogger(__name__)


def _refine_suggestions_for_page_type(page_type: str) -> list[str]:
    """Context-aware quick refinements for Studio chips (FE-04)."""
    core = [
        "Make it more minimal",
        "Dark color scheme",
        "Bigger CTA",
        "Change the tone",
    ]
    extras: dict[str, tuple[str, str]] = {
        "booking-form": ("Add pricing", "Add a phone number"),
        "contact-form": ("Add file upload", "Add address fields"),
        "proposal": ("Add a materials line for …", "Change labor rate to $/hr"),
        "pitch_deck": ("Focus more on traction", "Shorter — cut to 8 slides"),
        "rsvp": ("Add dietary restrictions", "Show event time prominently"),
        "menu": ("Highlight dietary info", "Add pricing"),
        "landing": ("Add social proof", "Tighter hero copy"),
        "survey": ("Shorten the intro", "Add one NPS follow-up"),
        "quiz": ("Sharpen a question", "Add a stronger outcome CTA"),
        "coming_soon": ("Tighten the countdown copy", "Add 3 more teaser bullets"),
        "resume": ("Quantify a bullet", "Tighten the summary"),
        "gallery": ("Add a stronger gallery headline", "Tighten inquiry form"),
        "link_in_bio": ("Add one more link", "Shorten the bio line"),
    }
    a, b = extras.get(page_type, ("Add pricing", "Add a phone number"))
    return [core[0], core[1], a, b, core[2], core[3]]


def _sse(event: str, payload: dict[str, Any]) -> bytes:
    return f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n".encode()


@dataclass
class StudioPipelineState:
    db: AsyncSession
    ctx: TenantContext
    user: User
    prompt: str
    provider: str | None
    existing_page_id: UUID | None
    org_row: Organization
    bundle: ContextBundle
    intent: PageIntent
    brand_snapshot: dict[str, Any] | None
    brand_hint: dict[str, Any] | None
    primary: str
    secondary: str
    run_id: UUID
    pipeline_started: float
    node_timings: dict[str, int]
    composed: Any


async def prepare_studio_page_generation(
    *,
    db: AsyncSession,
    ctx: TenantContext,
    user: User,
    prompt: str,
    provider: str | None,
    existing_page_id: UUID | None,
    forced_workflow: str | None = None,
    vision_attachment_ids: list[UUID] | None = None,
) -> tuple[list[bytes], StudioPipelineState | None]:
    """Context gather + intent parse; SSE bytes for replay; None state if org missing."""
    replay: list[bytes] = []
    brand_row = (
        await db.execute(select(BrandKit).where(BrandKit.organization_id == ctx.organization_id))
    ).scalar_one_or_none()
    brand_hint: dict[str, Any] | None = None
    brand_snapshot: dict[str, Any] | None = None
    primary = "#2563EB"
    secondary = "#0F172A"
    if brand_row:
        brand_hint = {
            "primary_color": brand_row.primary_color,
            "secondary_color": brand_row.secondary_color,
            "voice_note": brand_row.voice_note,
        }
        brand_snapshot = {
            "primary_color": brand_row.primary_color,
            "secondary_color": brand_row.secondary_color,
            "display_font": brand_row.display_font,
            "body_font": brand_row.body_font,
            "voice_note": brand_row.voice_note,
        }
        if brand_row.primary_color:
            primary = brand_row.primary_color
        if brand_row.secondary_color:
            secondary = brand_row.secondary_color

    org_row = await db.get(Organization, ctx.organization_id)
    if org_row is None:
        replay.append(_sse("error", {"code": "not_found", "message": "Organization not found"}))
        return replay, None

    run_id = uuid4()
    pipeline_started = time.perf_counter()
    node_timings: dict[str, int] = {}
    composed = None

    replay.append(_sse("context", {"phase": "started"}))
    bundle = await gather_context(
        db=db,
        org=org_row,
        user=user,
        prompt=prompt,
        time_budget_seconds=3.0,
        vision_attachment_ids=vision_attachment_ids,
    )
    replay.append(
        _sse(
            "context.gathered",
            {
                "duration_ms": bundle.gather_duration_ms,
                "incomplete": bundle.gather_incomplete,
                "urls": bundle.prompt_urls,
                "vision_attachments": len(bundle.vision_inputs),
            },
        )
    )
    if bundle.vision_inputs:
        replay.append(
            _sse(
                "context.vision",
                {
                    "count": len(bundle.vision_inputs),
                    "kinds": [v.kind for v in bundle.vision_inputs],
                },
            )
        )
    if bundle.site_brand:
        replay.append(
            _sse(
                "context.brand.extracted",
                {
                    "url": bundle.site_brand.url,
                    "business_name": bundle.site_brand.business_name,
                    "primary_color": bundle.site_brand.primary_color,
                },
            )
        )
        sb = bundle.site_brand
        if brand_hint is None:
            brand_hint = {}
        if sb.primary_color and not brand_hint.get("primary_color"):
            brand_hint["primary_color"] = sb.primary_color
            primary = sb.primary_color
        if sb.secondary_color and not brand_hint.get("secondary_color"):
            brand_hint["secondary_color"] = sb.secondary_color
            secondary = sb.secondary_color
        if sb.display_font or sb.body_font:
            snap = dict(brand_snapshot) if brand_snapshot else {}
            if sb.display_font:
                snap["display_font"] = snap.get("display_font") or sb.display_font
            if sb.body_font:
                snap["body_font"] = snap.get("body_font") or sb.body_font
            brand_snapshot = snap or brand_snapshot
    if bundle.site_voice:
        replay.append(_sse("context.voice.inferred", {"summary": bundle.site_voice.persona_summary[:200]}))
    if bundle.site_products:
        replay.append(_sse("context.products.found", {"count": len(bundle.site_products)}))

    ctx_block = bundle.to_prompt_context().strip()
    t_intent0 = time.perf_counter()
    try:
        intent = await parse_intent(
            prompt,
            brand_hint=brand_hint,
            provider=provider,
            db=db,
            organization_id=ctx.organization_id,
            context_block=ctx_block if ctx_block else None,
        )
    except Exception as e:
        logger.exception("intent_fatal %s", e)
        intent = PageIntent(title_suggestion=prompt[:80] or "Page")
    intent = apply_forced_workflow(intent, forced_workflow)
    node_timings["intent_parser"] = int((time.perf_counter() - t_intent0) * 1000)

    replay.append(
        _sse(
            "intent",
            {
                "workflow": intent.workflow,
                "confidence": intent.confidence,
                "alternatives": [a.model_dump(mode="json") for a in intent.alternatives],
                "intent": intent.model_dump(mode="json"),
            },
        )
    )
    if intent.confidence < 0.85:
        clarify_cands: list[dict[str, Any]] = [
            {"workflow": intent.workflow, "confidence": intent.confidence},
        ]
        for a in intent.alternatives[:2]:
            clarify_cands.append({"workflow": a.workflow, "confidence": a.confidence})
        replay.append(_sse("clarify", {"candidates": clarify_cands[:3]}))

    replay.append(_sse("html.start", {"status": "composing"}))

    state = StudioPipelineState(
        db=db,
        ctx=ctx,
        user=user,
        prompt=prompt,
        provider=provider,
        existing_page_id=existing_page_id,
        org_row=org_row,
        bundle=bundle,
        intent=intent,
        brand_snapshot=brand_snapshot,
        brand_hint=brand_hint,
        primary=primary,
        secondary=secondary,
        run_id=run_id,
        pipeline_started=pipeline_started,
        node_timings=node_timings,
        composed=composed,
    )
    return replay, state


async def stream_page_generation(
    *,
    db: AsyncSession,
    ctx: TenantContext,
    user: User,
    prompt: str,
    provider: str | None,
    existing_page_id: UUID | None,
    forced_workflow: str | None = None,
    vision_attachment_ids: list[UUID] | None = None,
) -> AsyncIterator[bytes]:
    """Yield SSE chunks: intent → html.chunk (per section) → html.complete | error."""
    replay, state = await prepare_studio_page_generation(
        db=db,
        ctx=ctx,
        user=user,
        prompt=prompt,
        provider=provider,
        existing_page_id=existing_page_id,
        forced_workflow=forced_workflow,
        vision_attachment_ids=vision_attachment_ids,
    )
    for chunk in replay:
        yield chunk
    if state is None:
        return
    async for chunk in stream_studio_page_generation_tail(state):
        yield chunk


async def stream_studio_page_generation_tail(state: StudioPipelineState) -> AsyncIterator[bytes]:
    db = state.db
    ctx = state.ctx
    user = state.user
    prompt = state.prompt
    provider = state.provider
    existing_page_id = state.existing_page_id
    org_row = state.org_row
    bundle = state.bundle
    intent = state.intent
    brand_snapshot = state.brand_snapshot
    primary = state.primary
    secondary = state.secondary
    run_id = state.run_id
    pipeline_started = state.pipeline_started
    node_timings = state.node_timings
    composed = state.composed
    forge_credit_applied: tuple[str, int] | None = None

    title = intent.title_suggestion or "Untitled"
    existing: Page | None = None
    if existing_page_id is not None:
        ep = await db.get(Page, existing_page_id)
        if ep is None or ep.organization_id != ctx.organization_id:
            yield _sse("error", {"code": "not_found", "message": "Page not found"})
            return
        existing = ep
        slug = ep.slug
        title = intent.title_suggestion or ep.title or title
    else:
        base_slug = slugify_page_title(title)
        slug = await unique_page_slug(db, ctx.organization_id, base_slug)

    org_slug = org_row.slug
    form_action = f"/p/{org_slug}/{slug}/submit"

    t_plan0 = time.perf_counter()
    plan, page_plan = build_assembly_from_intent(intent, bundle)
    node_timings["planner"] = int((time.perf_counter() - t_plan0) * 1000)

    yield _sse(
        "plan",
        {
            "sections": [s.id for s in page_plan.sections],
            "voice": page_plan.voice_profile.tone,
        },
    )
    yield _sse("compose.start", {})
    t_comp0 = time.perf_counter()

    if settings.USE_AGENT_COMPOSER and intent.page_type not in ("pitch_deck", "proposal"):
        try:
            from app.services.orchestration.composer.registry import compose_with_best_agent

            composed = await compose_with_best_agent(
                plan=page_plan,
                bundle=bundle,
                intent=intent,
                user_prompt=prompt,
                provider=provider,
                db=db,
                organization_id=ctx.organization_id,
                form_action=form_action,
                org_slug=org_slug,
                page_slug=slug,
            )
        except Exception as e:
            logger.warning("agent_compose_fallback %s", e)

    if composed is not None:
        for i, node in enumerate(composed.tree.components):
            frag = render_top_level_component(
                node,
                page_plan.brand_tokens,
                form_action=form_action,
            )
            yield _sse("html.chunk", {"index": i, "component": node.name, "fragment": frag})
            yield _sse(
                "compose.section",
                {"section": node.name, "html": frag[:2000]},
            )
        html = composed.html
        node_timings["composer"] = int((time.perf_counter() - t_comp0) * 1000)
        yield _sse(
            "compose.complete",
            {
                "html_length": len(html),
                "duration_ms": node_timings.get("composer", 0),
                "agent": True,
            },
        )
    else:
        for i, sec in enumerate(plan.sections):
            sid = f"{sec.component}-{i}"
            frag = render_section(sec, form_action=form_action, section_id=sid)
            yield _sse("html.chunk", {"index": i, "component": sec.component, "fragment": frag})
            yield _sse(
                "compose.section",
                {"section": sec.component, "html": frag[:2000]},
            )

        html = assemble_html(
            plan,
            title=title,
            org_slug=org_slug,
            page_slug=slug,
            primary=primary,
            secondary=secondary,
        )
        node_timings["composer"] = int((time.perf_counter() - t_comp0) * 1000)
        yield _sse(
            "compose.complete",
            {"html_length": len(html), "duration_ms": node_timings.get("composer", 0)},
        )

    requires_form = intent.page_type in ("contact-form", "booking-form", "rsvp")
    ok, reason = validate_generated_html(html)
    if ok:
        ok, reason = validate_compose_graph(html, requires_form=requires_form)
    if not ok:
        logger.warning("html_validate_retry %s", reason)
        composed = None
        plan2 = apply_plan_constraints(intent, default_assembly_plan(intent))
        yield _sse("compose.start", {"retry": True})
        for i, sec in enumerate(plan2.sections):
            sid = f"{sec.component}-{i}"
            frag = render_section(sec, form_action=form_action, section_id=sid)
            payload = {"index": i, "component": sec.component, "fragment": frag, "retry": True}
            yield _sse("html.chunk", payload)
            yield _sse("compose.section", {"section": sec.component, "html": frag[:2000], "retry": True})
        html = assemble_html(
            plan2,
            title=title,
            org_slug=org_slug,
            page_slug=slug,
            primary=primary,
            secondary=secondary,
        )
        yield _sse("compose.complete", {"html_length": len(html), "retry": True})
        ok2, r2 = validate_generated_html(html)
        if ok2:
            ok2, r2 = validate_compose_graph(html, requires_form=requires_form)
        if not ok2:
            yield _sse("error", {"code": "validation_failed", "message": r2 or reason})
            return

    yield _sse("review.start", {})
    booking_enabled = intent.booking is not None and intent.booking.enabled
    merged_final: list[Any] = []
    report_final: Any = None
    voice_res_final: Any = None
    review_iterations_done = 0
    for iteration in range(2):
        try:
            tree_dict = composed.tree.model_dump(mode="json") if composed is not None else None
            prop_tree: ProposalComponentTree | None = None
            if composed is not None and isinstance(composed.tree, ProposalComponentTree):
                prop_tree = composed.tree
            report_final, voice_res_final, merged_final = await run_full_review(
                component_tree=tree_dict,
                html=html,
                page_plan=page_plan,
                intent=intent,
                user_prompt=prompt,
                provider=provider,
                db=db,
                organization_id=ctx.organization_id,
                proposal_tree=prop_tree,
                booking_enabled=booking_enabled,
            )
        except Exception as e:
            logger.warning("review_pipeline_soft_fail %s", e)
            report_final = None
            merged_final = []
        review_iterations_done = iteration + 1
        findings_list = merged_final or []
        if report_final is None:
            yield _sse(
                "review.complete",
                {"fixable_count": 0, "suggestions_count": 0, "quality_score": 88, "iteration": iteration},
            )
            break
        for f in findings_list:
            raw = f.model_dump(mode="json") if hasattr(f, "model_dump") else f
            fd = cast(dict[str, Any], raw)
            yield _sse("review.finding", fd)
        fixable_n = sum(1 for x in findings_list if getattr(x, "auto_fixable", False))
        sugg_n = sum(1 for x in findings_list if not getattr(x, "auto_fixable", False))
        yield _sse(
            "review.complete",
            {
                "fixable_count": fixable_n,
                "suggestions_count": sugg_n,
                "quality_score": report_final.overall_quality_score,
                "summary": report_final.summary[:1200],
                "iteration": iteration,
            },
        )
        if iteration == 1:
            break
        fixables = [
            f
            for f in findings_list
            if getattr(f, "auto_fixable", False) and getattr(f, "severity", "") in ("critical", "major")
        ]
        if composed is None or not fixables:
            break
        t_ref0 = time.perf_counter()
        try:
            composed.tree, html = await refine_component_tree_from_findings(
                tree=composed.tree,
                fixables=fixables[:24],
                plan=page_plan,
                intent=intent,
                user_prompt=prompt,
                provider=provider,
                db=db,
                organization_id=ctx.organization_id,
                form_action=form_action,
            )
            node_timings["review_refine"] = int((time.perf_counter() - t_ref0) * 1000)
        except Exception as e:
            logger.warning("review_refine_failed %s", e)
            break
        ok_r, reason_r = validate_generated_html(html)
        if ok_r and requires_form:
            ok_r, reason_r = validate_compose_graph(html, requires_form=requires_form)
        if not ok_r:
            logger.warning("post_refine_validate %s", reason_r)
            break
    yield _sse("validate.complete", {"valid": True})

    review_report_blob: dict[str, Any] | None = None
    quality_score_out = 88
    degraded_q = False
    if report_final is not None:
        quality_score_out = int(report_final.overall_quality_score)
        review_report_blob = {
            "quality_score": report_final.overall_quality_score,
            "summary": report_final.summary,
            "findings": [f.model_dump(mode="json") for f in merged_final],
            "voice": voice_res_final.model_dump(mode="json") if voice_res_final else {},
            "iterations": review_iterations_done,
        }
        degraded_q = any(f.severity == "critical" for f in merged_final) or (
            report_final.overall_quality_score < 55
        )

    form_schema: dict[str, Any] | None = None
    if intent.fields:
        form_schema = {
            "fields": [
                {
                    "name": f.name,
                    "label": f.label,
                    "type": f.field_type,
                    "required": f.required,
                }
                for f in intent.fields
            ]
        }
    elif composed is not None and composed.metadata.get("form_schema_hints"):
        form_schema = composed.metadata["form_schema_hints"]

    if intent.booking and intent.booking.enabled:
        form_schema = dict(form_schema) if form_schema else {}
        fb_m: dict[str, Any] = {"enabled": True}
        if intent.booking.duration_minutes:
            fb_m["duration_minutes"] = int(intent.booking.duration_minutes)
        if intent.booking.calendar_id:
            fb_m["calendar_id"] = str(intent.booking.calendar_id)
        prev = form_schema.get("forge_booking")
        if isinstance(prev, dict):
            form_schema["forge_booking"] = {**prev, **fb_m}
        else:
            form_schema["forge_booking"] = fb_m

    if existing is not None:
        page = existing
        page.title = title
        page.page_type = intent.page_type
        html = await finalize_proposal_studio_html(
            db,
            page=page,
            html=html,
            intent=intent,
            prompt=prompt,
            title=title,
            org=org_row,
            primary=primary,
            secondary=secondary,
        )
        html = await finalize_deck_studio_html(
            db,
            page=page,
            html=html,
            intent=intent,
            prompt=prompt,
            title=title,
            org=org_row,
            primary=primary,
            secondary=secondary,
        )
        if intent.page_type == "proposal":
            okp, reasonp = validate_generated_html(html)
            if not okp:
                yield _sse("error", {"code": "validation_failed", "message": reasonp})
                return
        if intent.page_type == "pitch_deck":
            okd, reasond = validate_generated_html(html)
            if not okd:
                yield _sse("error", {"code": "validation_failed", "message": reasond})
                return
        page.current_html = html
        page.form_schema = form_schema
        page.intent_json = intent.model_dump(mode="json")
        page.brand_kit_snapshot = brand_snapshot
        page.last_review_quality_score = quality_score_out if review_report_blob else None
        page.last_review_report = review_report_blob
        page.review_degraded_quality = degraded_q
        db.add(
            PageRevision(
                page_id=page.id,
                organization_id=ctx.organization_id,
                html=html,
                edit_type="refine",
                user_prompt=prompt[:2000],
                tokens_used=None,
                llm_provider=None,
                llm_model=None,
            )
        )
        total_ms = int((time.perf_counter() - pipeline_started) * 1000)
        try:
            await record_run(
                db,
                run_id=run_id,
                organization_id=ctx.organization_id,
                user_id=user.id,
                page_id=page.id,
                graph_name="generate",
                prompt=prompt,
                intent=intent.model_dump(mode="json"),
                plan=page_plan.model_dump(mode="json"),
                node_timings=node_timings,
                status="completed",
                total_duration_ms=total_ms,
                review_findings=review_report_blob,
            )
        except Exception:
            logger.exception("orchestration_run_record_failed")
        spec_action, _ = studio_credit_charge_spec(intent, refining_existing_page=True)
        charge_amt = compute_studio_pipeline_credits(intent, refining_existing_page=True)
        forge_credit_applied = (spec_action, charge_amt)
        await apply_charge(
            db,
            ctx.organization_id,
            action=spec_action,
            credits=charge_amt,
            user_id=user.id,
            page_id=page.id,
            orchestration_run_id=run_id,
            provider=provider,
            model=None,
        )
        await db.commit()
        await db.refresh(page)
        pid = page.id
    else:
        page = Page(
            organization_id=ctx.organization_id,
            slug=slug,
            page_type=intent.page_type,
            title=title,
            current_html=html,
            form_schema=form_schema,
            intent_json=intent.model_dump(mode="json"),
            brand_kit_snapshot=brand_snapshot,
            created_by_user_id=user.id,
            last_review_quality_score=quality_score_out if review_report_blob else None,
            last_review_report=review_report_blob,
            review_degraded_quality=degraded_q,
        )
        db.add(page)
        await db.flush()
        pid = page.id
        html = await finalize_proposal_studio_html(
            db,
            page=page,
            html=html,
            intent=intent,
            prompt=prompt,
            title=title,
            org=org_row,
            primary=primary,
            secondary=secondary,
        )
        html = await finalize_deck_studio_html(
            db,
            page=page,
            html=html,
            intent=intent,
            prompt=prompt,
            title=title,
            org=org_row,
            primary=primary,
            secondary=secondary,
        )
        if intent.page_type == "proposal":
            okp, reasonp = validate_generated_html(html)
            if not okp:
                yield _sse("error", {"code": "validation_failed", "message": reasonp})
                return
        if intent.page_type == "pitch_deck":
            okd, reasond = validate_generated_html(html)
            if not okd:
                yield _sse("error", {"code": "validation_failed", "message": reasond})
                return
        page.current_html = html
        page.last_review_quality_score = quality_score_out if review_report_blob else None
        page.last_review_report = review_report_blob
        page.review_degraded_quality = degraded_q
        db.add(
            PageRevision(
                page_id=pid,
                organization_id=ctx.organization_id,
                html=html,
                edit_type="generate",
                user_prompt=prompt[:2000],
                tokens_used=None,
                llm_provider=None,
                llm_model=None,
            )
        )
        total_ms = int((time.perf_counter() - pipeline_started) * 1000)
        try:
            await record_run(
                db,
                run_id=run_id,
                organization_id=ctx.organization_id,
                user_id=user.id,
                page_id=pid,
                graph_name="generate",
                prompt=prompt,
                intent=intent.model_dump(mode="json"),
                plan=page_plan.model_dump(mode="json"),
                node_timings=node_timings,
                status="completed",
                total_duration_ms=total_ms,
                review_findings=review_report_blob,
            )
        except Exception:
            logger.exception("orchestration_run_record_failed")
        spec_action, _ = studio_credit_charge_spec(intent, refining_existing_page=False)
        charge_amt = compute_studio_pipeline_credits(intent, refining_existing_page=False)
        forge_credit_applied = (spec_action, charge_amt)
        await apply_charge(
            db,
            ctx.organization_id,
            action=spec_action,
            credits=charge_amt,
            user_id=user.id,
            page_id=pid,
            orchestration_run_id=run_id,
            provider=provider,
            model=None,
        )
        await db.commit()
        await db.refresh(page)
        await increment_pages_generated(db, ctx.organization_id)

    org_for_usage = await db.get(Organization, ctx.organization_id)
    if org_for_usage is not None and forge_credit_applied is not None:
        apply_rolling_resets_in_memory(org_for_usage)
        yield _sse(
            "credit.charged",
            {
                "action": forge_credit_applied[0],
                "credits": forge_credit_applied[1],
                "usage": credits_usage_dict(org_for_usage),
                "run_id": str(run_id),
            },
        )

    yield _sse(
        "persist",
        {"page_id": str(pid), "slug": slug, "run_id": str(run_id)},
    )
    yield _sse(
        "html.complete",
        {
            "page_id": str(pid),
            "slug": slug,
            "title": title,
            "refine_suggestions": _refine_suggestions_for_page_type(intent.page_type),
            "page_type": intent.page_type,
            "run_id": str(run_id),
            "quality_score": quality_score_out,
            "review_summary": (report_final.summary[:800] if report_final else ""),
            "degraded_quality": degraded_q,
            "publish_ack_required": bool(report_final and report_final.overall_quality_score < 50),
        },
    )
    yield _sse(
        "done",
        {
            "page_id": str(pid),
            "url": f"/pages/{slug}",
            "run_id": str(run_id),
        },
    )
