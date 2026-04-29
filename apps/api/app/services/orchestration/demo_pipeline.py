"""Anonymous marketing demo — same SSE shape as Studio, no DB writes."""

from __future__ import annotations

import json
import logging
import re
from collections.abc import AsyncIterator
from typing import Any

from app.services.orchestration.html_validate import validate_generated_html
from app.services.orchestration.intent_parser import compose_assembly_plan, parse_intent
from app.services.orchestration.models import PageIntent
from app.services.orchestration.page_composer import (
    apply_plan_constraints,
    assemble_html,
    default_assembly_plan,
    render_section,
)

logger = logging.getLogger(__name__)

# Marketing hero brand (no org — warm teal / slate from design direction)
_DEMO_PRIMARY = "#0d9488"
_DEMO_SECONDARY = "#0f172a"
_DEMO_ORG = "demo"
_DEMO_SLUG = "demo-preview"
_EVENT_HANDLER_ATTR = re.compile(r"\s+on[a-zA-Z]+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)")
_SCRIPT_BLOCK = re.compile(r"<script\b[^>]*>.*?</script\s*>", re.IGNORECASE | re.DOTALL)


def _sse(event: str, payload: dict[str, Any]) -> bytes:
    return f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n".encode()


def _strip_event_handlers(html: str) -> str:
    """Public demo output is anonymous and should never ship inline JS handlers."""
    return _EVENT_HANDLER_ATTR.sub("", _SCRIPT_BLOCK.sub("", html))


async def stream_demo_page(
    *,
    prompt: str,
    provider: str | None,
) -> AsyncIterator[bytes]:
    """SSE: intent → html.chunk → html.complete (no persistence)."""
    brand_hint: dict[str, Any] | None = None

    try:
        intent = await parse_intent(prompt, brand_hint=brand_hint, provider=provider)
    except Exception as e:
        logger.exception("demo_intent_fatal %s", e)
        intent = PageIntent(title_suggestion=prompt[:80] or "Page")

    yield _sse("intent", {"intent": intent.model_dump(mode="json")})

    title = intent.title_suggestion or "Untitled"
    slug = _DEMO_SLUG
    form_action = f"/p/{_DEMO_ORG}/{slug}/submit"

    plan = await compose_assembly_plan(intent, provider=provider, bundle=None)

    for i, sec in enumerate(plan.sections):
        sid = f"{sec.component}-{i}"
        frag = render_section(sec, form_action=form_action, section_id=sid)
        yield _sse("html.chunk", {"index": i, "component": sec.component, "fragment": frag})

    html = assemble_html(
        plan,
        title=title,
        org_slug=_DEMO_ORG,
        page_slug=slug,
        primary=_DEMO_PRIMARY,
        secondary=_DEMO_SECONDARY,
    )
    html = _strip_event_handlers(html)

    ok, reason = validate_generated_html(html)
    if not ok:
        logger.warning("demo_html_validate_retry %s", reason)
        plan2 = apply_plan_constraints(intent, default_assembly_plan(intent))
        for i, sec in enumerate(plan2.sections):
            sid = f"{sec.component}-{i}"
            frag = render_section(sec, form_action=form_action, section_id=sid)
            payload = {"index": i, "component": sec.component, "fragment": frag, "retry": True}
            yield _sse("html.chunk", payload)
        html = assemble_html(
            plan2,
            title=title,
            org_slug=_DEMO_ORG,
            page_slug=slug,
            primary=_DEMO_PRIMARY,
            secondary=_DEMO_SECONDARY,
        )
        html = _strip_event_handlers(html)
        ok2, _ = validate_generated_html(html)
        if not ok2:
            yield _sse("error", {"code": "validation_failed", "message": reason})
            return

    yield _sse(
        "html.complete",
        {
            "page_id": None,
            "slug": slug,
            "title": title,
            "demo": True,
            "html": html,
        },
    )
