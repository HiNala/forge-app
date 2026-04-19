"""Proposal numbering, pricing math, boilerplate (W-02)."""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Organization, Page, Proposal, ProposalSequence
from app.services.orchestration.models import PageIntent


def org_proposal_prefix(org: Organization) -> str:
    """2–4 char prefix from org_settings or company name."""
    settings = org.org_settings if isinstance(org.org_settings, dict) else {}
    raw = (settings.get("proposal_prefix") or "").strip()
    if raw:
        s = re.sub(r"[^A-Za-z0-9]", "", raw.upper())[:4]
        if s:
            return s
    name = (org.name or "ORG").upper()
    letters = re.sub(r"[^A-Z0-9]", "", name)
    return (letters[:3] if len(letters) >= 2 else "ORG")[:3]


def recompute_line_totals(line_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Ensure each row has total_cents = qty * rate_cents for numeric qty."""
    out: list[dict[str, Any]] = []
    for row in line_items:
        r = dict(row)
        qty = r.get("qty")
        rate = r.get("rate_cents", 0)
        try:
            qf = float(qty) if qty is not None else 1.0
        except (TypeError, ValueError):
            qf = 1.0
        try:
            ri = int(rate)
        except (TypeError, ValueError):
            ri = 0
        total = int(round(qf * ri))
        r["total_cents"] = total
        out.append(r)
    return out


def compute_totals(
    line_items: list[dict[str, Any]],
    *,
    tax_rate_bps: int,
) -> tuple[int, int, int]:
    """Return (subtotal_cents, tax_cents, total_cents)."""
    normalized = recompute_line_totals(line_items)
    subtotal = sum(int(x.get("total_cents", 0) or 0) for x in normalized)
    tax = (subtotal * max(tax_rate_bps, 0) + 5000) // 10000  # half-up to integer cents
    return subtotal, tax, subtotal + tax


def proposal_html_includes_mandatory_sections(html: str) -> bool:
    """Heuristic: generated HTML contains structural hooks + disclaimer markers."""
    h = html.lower()
    if "data-forge-section" not in h:
        return False
    if "not a contract" not in h and "proposal-not-a-contract" not in h:
        return False
    if "accept" not in h:
        return False
    return "forge is not a law firm" in h or "forge-legal-disclaimer" in h


async def allocate_proposal_number(db: AsyncSession, *, organization_id: UUID) -> str:
    """Thread-safe yearly sequence: PREFIX-YYYY-NNNN."""
    year = datetime.now(UTC).year
    org = await db.get(Organization, organization_id)
    if org is None:
        raise ValueError("organization not found")
    prefix = org_proposal_prefix(org)

    row = (
        await db.execute(
            select(ProposalSequence).where(
                ProposalSequence.organization_id == organization_id,
                ProposalSequence.year == year,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        row = ProposalSequence(organization_id=organization_id, year=year, next_seq=1)
        db.add(row)
        await db.flush()
    current = row.next_seq
    row.next_seq = current + 1
    await db.flush()
    return f"{prefix}-{year}-{current:04d}"


async def ensure_proposal_number(
    db: AsyncSession,
    *,
    proposal: Proposal,
) -> None:
    if proposal.proposal_number:
        return
    proposal.proposal_number = await allocate_proposal_number(
        db, organization_id=proposal.organization_id
    )


DEFAULT_PAYMENT_TERMS = (
    "50% deposit due on acceptance; remainder due at substantial completion "
    "unless otherwise stated."
)
DEFAULT_LEGAL_TERMS = (
    "This document is a proposal, not a binding contract, until you accept it using the mechanism "
    "below. By accepting, you agree to the scope, pricing, and terms stated here. Change orders "
    "require written approval from both parties. Cancellation and refund terms apply as described. "
    "Forge is not a law firm and does not provide legal advice — consult a licensed attorney "
    "for legal questions."
)


def seed_proposal_from_prompt(proposal: Proposal, prompt: str, *, title_suggestion: str) -> None:
    """Heuristic extraction for Studio first pass — populates DB fields without an LLM."""
    p = prompt.strip()
    proposal.project_title = (title_suggestion or proposal.project_title)[:500]
    excerpt = p[:400] + ("…" if len(p) > 400 else "")
    proposal.executive_summary = excerpt or proposal.executive_summary

    # Client name: "Johnson property", "for John", etc.
    m_prop = re.search(r"\b([A-Z][a-z]+)\s+property\b", p)
    m_for = re.search(r"\bfor\s+([A-Z][a-z]+)\b", p)
    if m_prop:
        proposal.client_name = m_prop.group(1)
    elif m_for:
        proposal.client_name = m_for.group(1)
    else:
        proposal.client_name = proposal.client_name or "Client"

    line_items: list[dict[str, Any]] = list(proposal.line_items or [])
    mat = re.search(
        r"materials?\s*\$?\s*([\d,]+(?:\.\d+)?)",
        p,
        re.IGNORECASE,
    )
    if mat:
        raw = mat.group(1).replace(",", "")
        try:
            cents = int(round(float(raw) * 100))
            line_items.append(
                {
                    "category": "Materials",
                    "description": "Materials",
                    "qty": 1,
                    "unit": "lot",
                    "rate_cents": cents,
                    "total_cents": cents,
                }
            )
        except ValueError:
            pass

    labor_rate = re.search(
        r"\$?\s*(\d+(?:\.\d+)?)\s*/\s*hour",
        p,
        re.IGNORECASE,
    )
    days = re.search(r"(\d+(?:\.\d+)?)\s*days?\s+(?:labor|work)", p, re.IGNORECASE)
    if labor_rate:
        try:
            rate = float(labor_rate.group(1))
            rate_cents = int(round(rate * 100))
            hrs = 8.0
            d_ct = float(days.group(1)) if days else 1.0
            qty = d_ct * hrs
            tot = int(round(qty * rate_cents))
            line_items.append(
                {
                    "category": "Labor",
                    "description": "On-site labor",
                    "qty": qty,
                    "unit": "hr",
                    "rate_cents": rate_cents,
                    "total_cents": tot,
                }
            )
        except (ValueError, TypeError):
            pass

    if line_items:
        proposal.line_items = line_items

    if not (proposal.scope_of_work and len(proposal.scope_of_work) > 0):
        proposal.scope_of_work = [
            {
                "phase": "Project delivery",
                "description": p[:1200] or "Scope as discussed.",
                "deliverables": ["Complete installation per plan", "Walkthrough on completion"],
            }
        ]

    proposal.timeline = proposal.timeline or [
        {"milestone": "Kickoff", "date": "TBD", "description": "Site access and staging"},
        {"milestone": "Completion", "date": "TBD", "description": "Final inspection"},
    ]

    proposal.expires_at = proposal.expires_at or (datetime.now(UTC) + timedelta(days=30))
    proposal.payment_terms = proposal.payment_terms or DEFAULT_PAYMENT_TERMS
    proposal.legal_terms = proposal.legal_terms or DEFAULT_LEGAL_TERMS


async def finalize_proposal_studio_html(
    db: AsyncSession,
    *,
    page: Page,
    html: str,
    intent: PageIntent,
    prompt: str,
    title: str,
    org: Organization,
    primary: str,
    secondary: str,
) -> str:
    """Replace generic assembled HTML with deterministic proposal document when applicable."""
    if intent.page_type != "proposal":
        return html
    prop = await get_or_create_proposal_for_page(db, page=page)
    seed_proposal_from_prompt(prop, prompt, title_suggestion=title)
    prop.line_items = recompute_line_totals(prop.line_items)
    tax_bps = prop.tax_rate_bps or 0
    sub, tax, tot = compute_totals(prop.line_items, tax_rate_bps=tax_bps)
    prop.subtotal_cents = sub
    prop.tax_cents = tax
    prop.total_cents = tot

    from app.services.proposal_render import render_proposal_html

    return render_proposal_html(
        org_name=org.name,
        org_slug=org.slug,
        page=page,
        proposal=prop,
        primary=primary,
        secondary=secondary,
    )


async def get_or_create_proposal_for_page(db: AsyncSession, *, page: Page) -> Proposal:
    """Ensure a proposals row exists for proposal pages (lazy create)."""
    if page.page_type != "proposal":
        raise ValueError("not a proposal page")
    row = (
        await db.execute(select(Proposal).where(Proposal.page_id == page.id))
    ).scalar_one_or_none()
    if row:
        return row
    row = Proposal(
        page_id=page.id,
        organization_id=page.organization_id,
        client_name="Client",
        project_title=page.title,
        scope_of_work=[],
        exclusions=[],
        line_items=[],
        subtotal_cents=0,
        tax_rate_bps=0,
        tax_cents=0,
        total_cents=0,
        timeline=[],
        payment_terms=DEFAULT_PAYMENT_TERMS,
        legal_terms=DEFAULT_LEGAL_TERMS,
        status="draft",
    )
    db.add(row)
    await db.flush()
    return row
