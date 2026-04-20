"""O-04 — expert panel, deterministic checks, merge weights."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ProposalComponentTree, ProposalLineItem
from app.services.orchestration.review.expert_panel import EXPERT_PANEL
from app.services.orchestration.review.models import Finding
from app.services.orchestration.review.service import merge_and_weight
from app.services.orchestration.review.workflow_checks import (
    form_integrity_checks,
    proposal_structural_checks,
)
from app.services.orchestration.review.workflow_weights import weights_for_workflow


def test_expert_panel_has_seven() -> None:
    assert len(EXPERT_PANEL) == 7
    names = {e.name for e in EXPERT_PANEL}
    assert "Dieter Rams" in names
    assert "Susan Kare" in names


def test_proposal_math_finding_when_mismatch() -> None:
    tree = ProposalComponentTree(
        line_items=[ProposalLineItem(description="A", qty=1, rate_cents=100)],
        tax_rate_bps=0,
        subtotal_cents=999,
        total_cents=999,
    )
    findings = proposal_structural_checks(tree)
    assert any("Math" in f.expert or "Proposal" in f.expert for f in findings)


def test_form_missing_submit() -> None:
    html = "<html><head><meta name=viewport></head><body><form action=/p/x/y/submit></form></body></html>"
    findings = form_integrity_checks(html, "contact-form", False)
    assert any("submit" in f.message.lower() for f in findings)


def test_merge_bumps_weighted_minor() -> None:
    f = Finding(
        expert="Don Norman",
        severity="minor",
        section_ref="x",
        dimension="affordance_clarity",
        message="test",
        suggested_action="fix",
        auto_fixable=True,
    )
    out = merge_and_weight([f], "proposal")
    assert out[0].severity == "major"


def test_weights_proposal_boosts_norman() -> None:
    w = weights_for_workflow("proposal")
    assert w["Don Norman"] >= 1.3
