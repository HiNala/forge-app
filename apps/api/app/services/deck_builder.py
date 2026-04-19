"""Build structured slides from narrative frameworks (W-03) — deterministic first-pass content."""

from __future__ import annotations

import re
import secrets
from typing import Any

from app.schemas.deck_blocks import (
    ChartBlock,
    ImageBlock,
    MetricBlock,
    QuoteBlock,
    Slide,
    TeamMember,
)
from app.services.orchestration.deck.frameworks import (
    DEFAULT_FRAMEWORK_KEY,
    FRAMEWORKS,
    resolve_framework_key,
)


def new_slide_id() -> str:
    return f"slide_{secrets.token_hex(5)}"


def infer_deck_kind(prompt: str) -> str:
    p = prompt.lower()
    if any(
        x in p
        for x in (
            "series a",
            "series b",
            "investor",
            "raising",
            "venture",
            "vc ",
            "seed round",
        )
    ):
        return "investor_pitch"
    if any(x in p for x in ("product launch", "launch deck", "ship ", "shipping")):
        return "product_launch"
    if any(x in p for x in ("all-hands", "all hands", "quarterly review", "qbr")):
        return "all_hands"
    if any(x in p for x in ("internal strategy", "strategy readout", "okrs", "okr")):
        return "internal_strategy"
    if any(x in p for x in ("sales deck", "enterprise", "prospects")):
        return "sales_pitch"
    if any(x in p for x in ("conference", "keynote", "talk at")):
        return "conference_talk"
    if "lecture" in p or "teaching" in p or "lesson" in p:
        return "teaching_lecture"
    return "generic"


def infer_narrative_framework(prompt: str) -> str:
    p = prompt.lower()
    if "y combinator" in p or p.strip().startswith("yc ") or " yc " in p:
        return "Y_COMBINATOR_PITCH"
    if "sequoia" in p or "series a" in p and "investor" in p:
        return "SEQUOIA_PITCH"
    if "network effect" in p or " nfx" in p or "flywheel" in p:
        return "NFX_PITCH"
    if "before " in p and "after" in p:
        return "BEFORE_AFTER_BRIDGE"
    if "product launch" in p or "launch deck" in p:
        return "PRODUCT_LAUNCH"
    if "all-hands" in p or "all hands" in p:
        return "ALL_HANDS"
    if "internal" in p and "strategy" in p:
        return "INTERNAL_STRATEGY"
    if "conference" in p or "keynote" in p:
        return "CONFERENCE_TALK"
    if "lecture" in p or "lesson" in p:
        return "TEACHING_LECTURE"
    if "sales" in p and "deck" in p:
        return "SALES_PITCH"
    return DEFAULT_FRAMEWORK_KEY


def _title_case_role(role: str) -> str:
    return role.replace("_", " ").title()


def build_slides_from_framework(
    *,
    prompt: str,
    deck_title: str,
    organization_name: str,
    framework_key: str | None = None,
) -> list[dict[str, Any]]:
    """Stage A+B combined: expand framework into Slide JSON dicts."""
    key = resolve_framework_key(framework_key)
    skeleton = FRAMEWORKS.get(key, FRAMEWORKS[DEFAULT_FRAMEWORK_KEY])
    topic = deck_title.strip() or "Untitled deck"
    hint_ctx = prompt.strip()[:400]
    slides: list[dict[str, Any]] = []
    for i, (layout, role, hint) in enumerate(skeleton):
        sid = new_slide_id()
        title = _title_case_role(role)
        body = (
            f"{hint} — anchored to “{topic}”. "
            f"Context from prompt: {hint_ctx}."
        )
        if len(body) > 1200:
            body = body[:1197] + "…"
        bullets: list[str] = []
        if layout == "bullet_list":
            bullets = [
                "Clarity beats completeness on this slide.",
                "Tie each point to a customer outcome.",
                "Remove anything not spoken aloud.",
            ]
        quote = None
        chart = None
        image = None
        team_members: list[TeamMember] = []
        metrics: list[MetricBlock] = []

        if layout == "big_number":
            metrics = [
                MetricBlock(
                    label="Signal metric",
                    value="$2.4M",
                    sublabel="rounded for readability",
                ),
            ]
        elif layout == "chart":
            chart = ChartBlock(
                chart_type="line",
                title=f"{title} trend",
                labels=["Q1", "Q2", "Q3", "Q4"],
                series=[{"name": "Series A", "data": [1, 2, 3, 5]}],
                is_placeholder=True,
                source_hint="Replace with your real quarterly numbers.",
            )
        elif layout == "team_grid":
            team_members = [
                TeamMember(name="Founder Name", role="CEO", bio="Prior wins in one line."),
                TeamMember(name="Cofounder", role="CTO", bio="Why you're credible builders."),
            ]
        elif layout in ("image_full", "image_with_caption", "title_cover"):
            image = ImageBlock(
                prompt=(
                    f"Modern minimal presentation visual for “{topic}”; "
                    "consistent palette; no text in image."
                ),
                alt=f"Illustration for {topic}",
            )
        elif layout == "quote":
            quote = QuoteBlock(
                text="Your customer should feel seen in one sentence.",
                attribution="Target persona",
            )

        slide = Slide(
            id=sid,
            order=i,
            layout=layout,  # type: ignore[arg-type]
            title=title if layout != "title_cover" else topic,
            subtitle=organization_name if layout == "title_cover" else None,
            body=None if layout in ("team_grid", "chart", "big_number") else body,
            bullets=bullets,
            quote=quote,
            chart=chart,
            image=image,
            team_members=team_members,
            metrics=metrics,
            speaker_notes=(
                f"Say this in 2–3 sentences: why this slide exists for “{topic}”, "
                f"and what you want the audience to remember when they leave the room."
            ),
            metadata={"role": role, "hint": hint, "framework": key},
        )
        slides.append(slide.model_dump(mode="json"))

    # Normalize title_cover first slide title to topic
    if slides and slides[0].get("layout") == "title_cover":
        slides[0]["title"] = topic
        slides[0]["subtitle"] = re.sub(r"\s+", " ", organization_name)[:200] or "Presenter"

    return slides


def default_theme(primary: str, secondary: str) -> dict[str, Any]:
    return {
        "font_heading": '"Cormorant Garamond", Georgia, serif',
        "font_body": "system-ui, Segoe UI, Roboto, sans-serif",
        "min_font_pt": 30,
        "primary": primary,
        "secondary": secondary,
        "slide_aspect": "16 / 9",
    }
