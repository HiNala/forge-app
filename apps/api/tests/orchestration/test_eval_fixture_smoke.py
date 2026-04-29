"""Load BP-01 eval fixtures (no LLM) — sanity for intent heuristics."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.services.orchestration.product_brain.agent_runners import _heuristic_intent

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def _load_smoke_cases() -> list[dict]:
    out: list[dict] = []
    for path in FIXTURES.glob("*.json"):
        if path.name == "README.md":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        out.append(data)
    return out


@pytest.mark.parametrize("fixture", _load_smoke_cases(), ids=lambda f: str(f.get("id", "case")))
def test_heuristic_fixture_has_workflow(fixture: dict[str, object]) -> None:
    prompt = str(fixture["prompt"])
    wf_hint = fixture.get("expected_workflow_contains")
    intent = _heuristic_intent(prompt)
    wf = intent.workflow_classification
    if wf_hint:
        assert str(wf_hint) in wf
    assert intent.primary_goal
