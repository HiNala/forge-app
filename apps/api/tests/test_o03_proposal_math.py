"""Mission O-03 — proposal line math."""

from app.services.orchestration.component_lib.schema import ProposalComponentTree, ProposalLineItem
from app.services.orchestration.composer.proposal_math import compute_subtotal_cents, validate_proposal_tree


def test_subtotal_sums() -> None:
    items = [
        ProposalLineItem(description="A", qty=2, rate_cents=10000, category="Labor"),
        ProposalLineItem(description="B", qty=1, rate_cents=5000, category="Materials"),
    ]
    assert compute_subtotal_cents(items) == 25000


def test_validate_mismatch_flags() -> None:
    tree = ProposalComponentTree(
        line_items=[
            ProposalLineItem(description="A", qty=1, rate_cents=10000, category="X"),
        ],
        tax_rate_bps=0,
        subtotal_cents=99999,
        total_cents=99999,
    )
    ok, sub, tax, tot = validate_proposal_tree(tree)
    assert sub == 10000
    assert ok is False
