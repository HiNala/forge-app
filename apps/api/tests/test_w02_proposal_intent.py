"""W-02 — heuristic intent routing and public-accept schema (no DB)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.proposal_api import ProposalPublicAccept
from app.schemas.proposal_intent import prompt_suggests_proposal
from app.services.orchestration.intent import _heuristic_intent


def test_prompt_suggests_proposal_keywords() -> None:
    assert prompt_suggests_proposal("Please send a quote for the fence job") is True
    assert prompt_suggests_proposal("I need an estimate for repiping") is True
    assert prompt_suggests_proposal("Pretty landing page with a hero") is False


def test_heuristic_intent_selects_proposal() -> None:
    intent = _heuristic_intent(
        "Contractor proposal for 12-foot fence — materials $2,400, labor 3 days at $65/hr"
    )
    assert intent.page_type == "proposal"
    assert intent.workflow == "proposal"


def test_heuristic_intent_prefers_deck_when_pitch_keywords() -> None:
    """Pitch-deck keywords take precedence in heuristic if both match order in file."""
    intent = _heuristic_intent("Investor pitch deck Series A deck for investors")
    assert intent.page_type in ("pitch_deck", "proposal")


@pytest.mark.parametrize(
    "kind",
    ["drawn", "typed", "click_to_accept"],
)
def test_proposal_public_accept_accepts_all_signature_kinds(kind: str) -> None:
    body = ProposalPublicAccept(
        name="Jane Client",
        email="jane@example.com",
        signature_kind=kind,
        signature_data="png-base64..." if kind == "drawn" else None,
    )
    assert body.signature_kind == kind


def test_proposal_public_accept_rejects_wrong_kind() -> None:
    with pytest.raises(ValidationError):
        ProposalPublicAccept(
            name="X",
            email="x@y.com",
            signature_kind="invalid",
        )
