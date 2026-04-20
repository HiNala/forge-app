"""Proposal document composer — uses ProposalComponentTree for priced sections."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ProposalComponentTree
from app.services.orchestration.composer.base import BaseComposer


class ProposalComposer(BaseComposer):
    workflow_key = "proposal"
    prompt_file = "proposal.v1.md"
    schema = ProposalComponentTree
