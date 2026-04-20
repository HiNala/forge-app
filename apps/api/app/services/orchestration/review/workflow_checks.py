"""Deterministic workflow checks — synthetic expert lenses (O-04)."""

from __future__ import annotations

import re
from typing import Any

from app.services.orchestration.review.models import Finding

from app.services.orchestration.component_lib.schema import ProposalComponentTree
from app.services.orchestration.composer.proposal_math import validate_proposal_tree


def _synth(expert: str, dimension: str, msg: str, action: str, **kw: Any) -> Finding:
    return Finding(
        expert=expert,
        severity=kw.get("severity", "critical"),
        section_ref=kw.get("section_ref"),
        dimension=dimension,
        message=msg,
        specific_quote=kw.get("specific_quote"),
        suggested_action=action,
        auto_fixable=bool(kw.get("auto_fixable", True)),
        confidence=float(kw.get("confidence", 1.0)),
    )


def proposal_structural_checks(tree: ProposalComponentTree | None) -> list[Finding]:
    if tree is None:
        return []
    out: list[Finding] = []
    ok, sub, tax, total = validate_proposal_tree(tree)
    if not ok:
        out.append(
            _synth(
                "Proposal Math Checker",
                "proposal_math",
                "Line items, tax, or totals do not match server-side calculation.",
                "Recompute totals from line items and tax rate; align subtotal_cents and total_cents.",
                section_ref="pricing",
                severity="critical",
            )
        )
    if not tree.line_items:
        out.append(
            _synth(
                "Proposal Math Checker",
                "line_items",
                "Proposal has no line items.",
                "Add at least one priced line item.",
                severity="critical",
            )
        )
    if not (tree.expiration_iso or "").strip():
        out.append(
            _synth(
                "Proposal Math Checker",
                "expiration",
                "No expiration date on the proposal.",
                "Set expiration_iso to a concrete ISO date.",
                severity="major",
                auto_fixable=True,
            )
        )
    return out


def deck_completeness_checks(html: str, page_type: str | None) -> list[Finding]:
    pt = (page_type or "").lower()
    if pt != "pitch_deck":
        return []
    low = html.lower()
    slide_markers = len(re.findall(r"data-forge-section=", low))
    out: list[Finding] = []
    if slide_markers < 5:
        out.append(
            _synth(
                "Deck Completeness",
                "slide_count",
                f"Deck appears thin ({slide_markers} sections) — typical pitch decks use 8–15 slides.",
                "Expand outline to cover problem, solution, traction, ask.",
                severity="major",
                auto_fixable=False,
                section_ref="deck",
            )
        )
    if "<h1" not in low and "role=\"heading\"" not in low:
        out.append(
            _synth(
                "Deck Completeness",
                "slide_titles",
                "Missing clear heading structure for slides.",
                "Ensure each slide has a title in the outline.",
                severity="major",
                auto_fixable=False,
            )
        )
    return out


def form_integrity_checks(html: str, page_type: str | None, booking_enabled: bool) -> list[Finding]:
    pt = (page_type or "").lower()
    if pt not in ("contact-form", "booking-form", "rsvp"):
        return []
    low = html.lower()
    out: list[Finding] = []
    if "<form" not in low:
        out.append(
            _synth(
                "Form Integrity",
                "form_present",
                "Workflow requires a form element.",
                "Inject a form_stacked section with submit action.",
                severity="critical",
                section_ref="form",
            )
        )
    if 'type="submit"' not in low and "type='submit'" not in low and "<button" not in low:
        out.append(
            _synth(
                "Form Integrity",
                "submit_control",
                "No submit button detected.",
                "Add a primary submit button for the form.",
                severity="critical",
                section_ref="form",
            )
        )
    if booking_enabled and "slot" not in low and "picker" not in low:
        out.append(
            _synth(
                "Form Integrity",
                "booking_slot",
                "Booking enabled but no slot picker markup present.",
                "Wire field_slot_picker in the form.",
                severity="major",
                section_ref="booking",
                auto_fixable=True,
            )
        )
    return out
