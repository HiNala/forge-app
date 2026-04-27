"""Forge Credits balance / overage rules (P-04)."""

from __future__ import annotations

from app.services.billing.credits import compute_studio_pipeline_credits
from app.services.orchestration.models import PageIntent


def test_compute_studio_pipeline_credits_mapping() -> None:
    landing = PageIntent(page_type="landing", workflow="landing")
    assert compute_studio_pipeline_credits(landing, refining_existing_page=False) == 5
    deck = PageIntent(page_type="pitch_deck", workflow="pitch_deck")
    assert compute_studio_pipeline_credits(deck, refining_existing_page=False) == 25
    assert compute_studio_pipeline_credits(deck, refining_existing_page=True) == 3
