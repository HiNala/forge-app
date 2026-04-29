"""P-05 orchestration primitives."""

from __future__ import annotations

from uuid import uuid4

import pytest

from app.services.orchestration.brand_drift import drift_report
from app.services.orchestration.region_hash import detect_drift, hash_outside_region
from app.services.orchestration.scope import Scope, ScopeLevel


def test_scope_roundtrip() -> None:
    s = Scope(level=ScopeLevel.REGION, section_id="hero", screen_id="s1")
    assert s.level == ScopeLevel.REGION


def test_region_hash_drift() -> None:
    html = (
        '<div data-forge-section="a">AAA</div>'
        '<div data-forge-section="b">BBB</div>'
    )
    before = hash_outside_region(html, region=None, element_ids_in_region=["a"])
    # change b only
    html2 = (
        '<div data-forge-section="a">AAA</div>'
        '<div data-forge-section="b">ZZZ</div>'
    )
    after = hash_outside_region(html2, region=None, element_ids_in_region=["a"])
    drifted = detect_drift(before, after)
    assert "b" in drifted
    assert "a" not in drifted


def test_brand_drift_colors() -> None:
    html = '<div style="color: #ff0000">x</div>'
    r = drift_report(html, {"primary": "#2563EB", "secondary": "#0F172A"})
    assert "#ff0000".lower() in [x.lower() for x in r["color_drift"]]


def test_model_ids_from_route_dedupes() -> None:
    from app.services.llm.llm_router import ModelRoute, model_ids_from_route

    r = ModelRoute(
        role="composer",
        primary=("openai", "gpt-4o"),
        fallbacks=[("anthropic", "anthropic/claude-x"), ("gemini", "gpt-4o")],
    )
    assert model_ids_from_route(r) == ["gpt-4o", "anthropic/claude-x"]


@pytest.mark.asyncio
async def test_effective_route_defaults_when_db_empty() -> None:
    from app.services.llm.llm_router import ROUTES
    from app.services.llm.routing_config_service import effective_model_route

    r = await effective_model_route(None, None, role="composer", organization_id=uuid4())
    assert r.primary == ROUTES["composer"].primary
