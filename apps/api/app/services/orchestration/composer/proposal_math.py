"""Server-side proposal math — LLM suggests numbers; we recompute (Mission O-03)."""

from __future__ import annotations

from app.services.orchestration.component_lib.schema import ProposalComponentTree, ProposalLineItem


def line_total_cents(row: ProposalLineItem) -> int:
    return int(round(float(row.qty) * int(row.rate_cents)))


def compute_subtotal_cents(items: list[ProposalLineItem]) -> int:
    return sum(line_total_cents(i) for i in items)


def compute_tax_cents(subtotal_cents: int, tax_rate_bps: int) -> int:
    return (max(subtotal_cents, 0) * max(tax_rate_bps, 0) + 5000) // 10000


def validate_proposal_tree(tree: ProposalComponentTree) -> tuple[bool, int, int, int]:
    """Return (ok, subtotal, tax, total). ok is False if LLM totals disagree by >1 cent."""
    sub = compute_subtotal_cents(tree.line_items)
    tax = compute_tax_cents(sub, tree.tax_rate_bps)
    total = sub + tax
    ok = True
    if tree.subtotal_cents is not None and abs(tree.subtotal_cents - sub) > 1:
        ok = False
    if tree.total_cents is not None and abs(tree.total_cents - total) > 1:
        ok = False
    return ok, sub, tax, total
