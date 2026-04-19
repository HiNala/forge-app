"""W-02 — proposal pricing, seeding, render markers (no DB)."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.services.proposal_render import render_proposal_html
from app.services.proposal_service import (
    compute_totals,
    proposal_html_includes_mandatory_sections,
    recompute_line_totals,
    seed_proposal_from_prompt,
)


def test_line_items_sum_and_tax() -> None:
    items = [
        {
            "category": "Labor",
            "description": "Demo",
            "qty": 10,
            "unit": "hr",
            "rate_cents": 6500,
            "total_cents": 0,
        },
        {
            "category": "Materials",
            "description": "Wood",
            "qty": 1,
            "unit": "lot",
            "rate_cents": 240000,
            "total_cents": 0,
        },
    ]
    norm = recompute_line_totals(items)
    assert norm[0]["total_cents"] == 65000
    assert norm[1]["total_cents"] == 240000
    sub, tax, tot = compute_totals(norm, tax_rate_bps=800)  # 8%
    assert sub == 305000
    assert tax == 24400
    assert tot == 329400


def test_mandatory_sections_helper() -> None:
    bad = "<html><body><p>Hi</p></body></html>"
    assert proposal_html_includes_mandatory_sections(bad) is False
    good = """
    <div data-forge-section="cover">x</div>
    <p class="proposal-not-a-contract">This is a proposal, not a contract until accepted.</p>
    <p>By accepting below you agree.</p>
    <footer id="forge-legal-disclaimer">Forge is not a law firm and does not provide legal advice.</footer>
    """
    assert proposal_html_includes_mandatory_sections(good) is True


def test_seed_prompt_extracts_client_and_money() -> None:
    p = SimpleNamespace(
        project_title="Old",
        client_name="Client",
        executive_summary=None,
        line_items=[],
        scope_of_work=[],
        timeline=[],
        expires_at=None,
        payment_terms=None,
        legal_terms=None,
    )
    prompt = (
        "Fence installation for the Johnson property — 3 days labor at $65/hour, materials $2,400"
    )
    seed_proposal_from_prompt(p, prompt, title_suggestion="Fence proposal")
    assert p.client_name == "Johnson"
    cats = {str(x.get("category", "")) for x in p.line_items}
    assert "Materials" in cats
    assert "Labor" in cats


def test_render_includes_mandatory_markers() -> None:
    page = SimpleNamespace(id=uuid4(), slug="demo", title="Demo")
    pr = SimpleNamespace(
        proposal_number="RC-2026-0001",
        client_name="A",
        project_title="Project",
        executive_summary="Summary.",
        scope_of_work=[{"phase": "P1", "description": "Do work", "deliverables": ["X"]}],
        exclusions=[],
        line_items=[
            {
                "category": "Labor",
                "description": "Work",
                "qty": 1,
                "unit": "ea",
                "rate_cents": 10000,
                "total_cents": 10000,
            }
        ],
        subtotal_cents=10000,
        tax_rate_bps=0,
        tax_cents=0,
        total_cents=10000,
        currency="USD",
        timeline=[{"milestone": "Start", "date": "Next week", "description": "Go"}],
        payment_terms="Net 30",
        warranty=None,
        insurance=None,
        license_info=None,
        legal_terms="Terms text. Forge is not a law firm and does not provide legal advice.",
        expires_at=None,
        status="sent",
        decision_at=None,
    )
    html = render_proposal_html(
        org_name="Org Co",
        org_slug="org",
        page=page,
        proposal=pr,
    )
    assert proposal_html_includes_mandatory_sections(html)
    assert "data-forge-section" in html
    assert "acceptance-mechanism" in html
    assert "proposal-not-a-contract" in html
