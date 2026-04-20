"""Proposal-specific structural checks — see workflow_checks (O-04)."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ProposalComponentTree
from app.services.orchestration.review.models import Finding
from app.services.orchestration.review.workflow_checks import proposal_structural_checks

__all__ = ["proposal_structural_checks", "run_proposal_checks"]


def run_proposal_checks(tree: ProposalComponentTree | None) -> list[Finding]:
    return proposal_structural_checks(tree)
