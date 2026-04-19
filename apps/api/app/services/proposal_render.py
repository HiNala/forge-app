"""Deterministic proposal page HTML (W-02) — no inline scripts (passes html_validate)."""

# ruff: noqa: E501
from __future__ import annotations

import html as html_lib
from datetime import UTC, datetime
from typing import Any

from app.db.models import Page, Proposal


def _esc(s: str | None) -> str:
    return html_lib.escape(s or "", quote=True)


def _money(cents: int, currency: str) -> str:
    sym = "$" if (currency or "USD").upper() == "USD" else f"{currency} "
    return f"{sym}{cents / 100:,.2f}"


def _group_line_items(items: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for row in items:
        cat = str(row.get("category") or "General")
        groups.setdefault(cat, []).append(row)
    return groups


def render_proposal_html(
    *,
    org_name: str,
    org_slug: str,
    page: Page,
    proposal: Proposal,
    primary: str = "#2563EB",
    secondary: str = "#0F172A",
) -> str:
    """Full HTML document with data-forge-section markers and mandatory legal hooks."""
    pid = str(page.id)
    currency = proposal.currency or "USD"
    generated = datetime.now(UTC).strftime("%B %d, %Y")
    exp = ""
    if proposal.expires_at:
        exp = proposal.expires_at.astimezone(UTC).strftime("%B %d, %Y %Z")

    status_banner = ""
    if proposal.status == "accepted":
        status_banner = (
            '<div class="forge-prop-status forge-prop-accepted" data-forge-section="status">'
            "<p>This proposal was <strong>accepted</strong> on "
            f"{_esc(proposal.decision_at.strftime('%Y-%m-%d %H:%M UTC') if proposal.decision_at else '')}."
            "</p></div>"
        )
    elif proposal.status == "declined":
        status_banner = (
            '<div class="forge-prop-status forge-prop-declined" data-forge-section="status">'
            "<p>This proposal was <strong>declined</strong>.</p></div>"
        )
    elif proposal.status == "expired":
        status_banner = (
            '<div class="forge-prop-status forge-prop-expired" data-forge-section="status">'
            "<p>This proposal has <strong>expired</strong>.</p></div>"
        )
    elif proposal.status == "superseded":
        status_banner = (
            '<div class="forge-prop-status" data-forge-section="status">'
            "<p>This proposal was <strong>superseded</strong> by a newer version.</p></div>"
        )

    scope_rows = proposal.scope_of_work or []
    scope_html_parts: list[str] = []
    for i, block in enumerate(scope_rows):
        if not isinstance(block, dict):
            continue
        phase = _esc(str(block.get("phase", f"Phase {i + 1}")))
        desc = _esc(str(block.get("description", "")))
        dels = block.get("deliverables") or []
        dlist = ""
        if isinstance(dels, list) and dels:
            lis = "".join(f"<li>{_esc(str(x))}</li>" for x in dels)
            dlist = f"<ul class='forge-deliverables'>{lis}</ul>"
        scope_html_parts.append(
            f"<article class='forge-phase-card'><h4>{phase}</h4><p>{desc}</p>{dlist}</article>"
        )
    if not scope_html_parts:
        scope_html_parts.append(
            "<p><em>Scope of work will be detailed here.</em></p>"
        )
    scope_html_joined = "".join(scope_html_parts)

    excl = proposal.exclusions or []
    excl_ul = ""
    if isinstance(excl, list) and excl:
        excl_ul = "<ul>" + "".join(f"<li>{_esc(str(x))}</li>" for x in excl) + "</ul>"

    groups = _group_line_items(
        [x for x in (proposal.line_items or []) if isinstance(x, dict)]
    )
    price_rows: list[str] = []
    for cat, rows in groups.items():
        price_rows.append(
            f"<tr class='forge-cat'><td colspan='5'><strong>{_esc(cat)}</strong></td></tr>"
        )
        for r in rows:
            qty = r.get("qty", 1)
            unit = _esc(str(r.get("unit", "ea")))
            desc = _esc(str(r.get("description", "")))
            rc = int(r.get("rate_cents") or 0)
            tc = int(r.get("total_cents") or 0)
            price_rows.append(
                "<tr>"
                f"<td>{desc}</td>"
                f"<td class='num'>{html_lib.escape(str(qty))}</td>"
                f"<td>{unit}</td>"
                f"<td class='num'>{_money(rc, currency)}</td>"
                f"<td class='num'><strong>{_money(tc, currency)}</strong></td>"
                "</tr>"
            )

    tax_pct = (proposal.tax_rate_bps or 0) / 100.0
    timeline = proposal.timeline or []
    mile_parts: list[str] = []
    for i, m in enumerate(timeline if isinstance(timeline, list) else []):
        if not isinstance(m, dict):
            continue
        title = _esc(str(m.get("milestone", f"Milestone {i + 1}")))
        when = _esc(str(m.get("date", "")))
        md = _esc(str(m.get("description", "")))
        mile_parts.append(
            f"<div class='forge-mile'><span class='forge-mile-title'>{title}</span>"
            f"<span class='forge-mile-when'>{when}</span><p>{md}</p></div>"
        )
    if not mile_parts:
        mile_parts.append("<p><em>Timeline to be confirmed with project kickoff.</em></p>")

    # Simple horizontal milestone SVG
    n_m = max(len([x for x in timeline if isinstance(x, dict)]), 1)
    svg_w = 720
    step = svg_w / max(n_m, 1)
    circles = "".join(
        f"<circle cx='{30 + i * step}' cy='18' r='6' fill='{primary}'/>"
        for i in range(min(n_m, 6))
    )
    timeline_svg = (
        f"<svg class='forge-timeline-svg' viewBox='0 0 {svg_w} 40' role='img' "
        f"aria-label='Timeline' xmlns='http://www.w3.org/2000/svg'>"
        f"<line x1='20' y1='18' x2='{svg_w - 20}' y2='18' stroke='{secondary}' "
        f"stroke-width='2'/>{circles}</svg>"
    )

    prop_num = _esc(proposal.proposal_number or "Draft")
    price_rows_joined = "".join(price_rows)
    mile_parts_joined = "".join(mile_parts)
    accept_unlocked = proposal.status in ("sent", "viewed", "questioned")

    body = f"""
<header class="forge-proposalshell">
  <p id="proposal-not-a-contract" class="forge-disclaimer" data-forge-section="disclaimer">
    <strong>Important:</strong> This is a proposal, not a binding contract until you accept it
    using one of the mechanisms in the Acceptance section below.
  </p>
  <nav class="forge-proposals-nav" aria-label="Proposal sections">
    <a href="#section-overview">Overview</a>
    <a href="#section-scope">Scope</a>
    <a href="#section-pricing">Pricing</a>
    <a href="#section-timeline">Timeline</a>
    <a href="#section-terms">Terms</a>
    <a href="#section-accept">Accept</a>
  </nav>
</header>

{status_banner}

<section id="section-overview" class="forge-hero forge-proposals-hero" data-forge-section="overview">
  <div class="forge-proposals-hero-grid">
    <div>
      <p class="forge-prop-num">Proposal {prop_num}</p>
      <h1>{_esc(proposal.project_title)}</h1>
      <p class="forge-client-line">Prepared for <strong>{_esc(proposal.client_name)}</strong></p>
      <p class="forge-meta">Issued {_esc(generated)} · Organization: {_esc(org_name)}</p>
      <p class="forge-expires">Expires: {_esc(exp or "Upon acceptance or as noted in Terms")}</p>
    </div>
    <div class="forge-org-card">
      <h3>From</h3>
      <p>{_esc(org_name)}</p>
      <p class="forge-meta" id="forge-legal-disclaimer">
        Forge is not a law firm and does not provide legal advice. Consult a licensed attorney
        for legal questions.
      </p>
    </div>
  </div>
  <div class="forge-exec" data-forge-section="executive-summary">
    <h2>Executive summary</h2>
    <blockquote class="forge-exec-quote">
      {_esc(proposal.executive_summary or ("We are pleased to submit this proposal for " + proposal.project_title + "."))}
    </blockquote>
    <p class="forge-section-ts">This section was generated by {_esc(org_name)} on {_esc(generated)}.</p>
  </div>
</section>

<section id="section-scope" class="forge-proposals-sec" data-forge-section="scope">
  <h2>Scope of work</h2>
  <div class="forge-phase-grid">
    {scope_html_joined}
  </div>
  <button type="button" class="forge-ask-btn" data-forge-question-trigger="scope" title="Ask about this section">?</button>
  <p class="forge-section-ts">This section was generated by {_esc(org_name)} on {_esc(generated)}.</p>
</section>

<section id="section-exclusions" class="forge-proposals-sec" data-forge-section="exclusions">
  <h2>Exclusions</h2>
  {excl_ul if excl_ul else "<p><em>None stated.</em></p>"}
  <p class="forge-section-ts">This section was generated by {_esc(org_name)} on {_esc(generated)}.</p>
</section>

<section id="section-pricing" class="forge-proposals-sec" data-forge-section="pricing">
  <h2>Pricing</h2>
  <div class="forge-tablewrap">
    <table class="forge-price-table">
      <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Total</th></tr></thead>
      <tbody>
        {price_rows_joined}
      </tbody>
    </table>
  </div>
  <div class="forge-totals" data-forge-section="totals">
    <p>Subtotal: <strong>{_money(int(proposal.subtotal_cents or 0), currency)}</strong></p>
    <p>Tax ({tax_pct:.2f}%): <strong>{_money(int(proposal.tax_cents or 0), currency)}</strong></p>
    <p class="forge-grand">Total due: <strong>{_money(int(proposal.total_cents or 0), currency)}</strong></p>
  </div>
  <button type="button" class="forge-ask-btn" data-forge-question-trigger="pricing" title="Ask about this section">?</button>
  <p class="forge-section-ts">This section was generated by {_esc(org_name)} on {_esc(generated)}.</p>
</section>

<section id="section-timeline" class="forge-proposals-sec" data-forge-section="timeline">
  <h2>Timeline</h2>
  {timeline_svg}
  <div class="forge-milestones">
    {mile_parts_joined}
  </div>
  <button type="button" class="forge-ask-btn" data-forge-question-trigger="timeline" title="Ask about this section">?</button>
  <p class="forge-section-ts">This section was generated by {_esc(org_name)} on {_esc(generated)}.</p>
</section>

<section id="section-terms" class="forge-proposals-sec forge-terms" data-forge-section="terms">
  <h2>Terms</h2>
  <details open class="forge-acc"><summary>Payment</summary><div>{_esc(proposal.payment_terms)}</div></details>
  <details class="forge-acc"><summary>Warranty</summary><div>{_esc(proposal.warranty or "Standard workmanship warranty as described in legal terms.")}</div></details>
  <details class="forge-acc"><summary>Insurance &amp; license</summary><div>{_esc((proposal.insurance or "") + " " + (proposal.license_info or ""))}</div></details>
  <details class="forge-acc"><summary>Legal terms &amp; acceptance mechanism</summary>
    <div id="acceptance-mechanism" class="forge-legal-block">
      <p><strong>Acceptance.</strong> By clicking Accept below, you agree to the scope, pricing, and terms above.</p>
      <p>{_esc(proposal.legal_terms)}</p>
      <p>Cancellation and refund follow the payment terms and change-order procedure described herein.</p>
      <p>Change orders require written approval from both parties before additional work begins.</p>
      <p>Governing law: the jurisdiction where {_esc(org_name)} primarily operates, unless otherwise agreed in writing.</p>
    </div>
  </details>
  <p class="forge-section-ts">This section was generated by {_esc(org_name)} on {_esc(generated)}.</p>
</section>

<section id="section-accept" class="forge-proposals-sec forge-accept" data-forge-section="accept">
  <h2>Acceptance</h2>
  <div class="forge-accept-grid" data-forge-org="{_esc(org_slug)}" data-forge-page="{_esc(page.slug)}" data-forge-pid="{_esc(pid)}" data-locked="{'true' if not accept_unlocked else 'false'}">
    <label>Your name <input type="text" id="forge-acc-name" autocomplete="name" required /></label>
    <label>Email <input type="email" id="forge-acc-email" autocomplete="email" required /></label>
    <label>Phone (optional) <input type="tel" id="forge-acc-phone" autocomplete="tel" /></label>
    <fieldset class="forge-method">
      <legend>Method</legend>
      <label><input type="radio" name="forge-acc-kind" value="click_to_accept" checked /> Click to accept</label>
      <label><input type="radio" name="forge-acc-kind" value="typed" /> Typed signature</label>
      <label><input type="radio" name="forge-acc-kind" value="drawn" /> Drawn signature</label>
    </fieldset>
    <div id="forge-typed-wrap" class="forge-hidden">
      <label>Type your full name <input type="text" id="forge-typed-sig" /></label>
    </div>
    <div id="forge-draw-wrap" class="forge-hidden">
      <canvas id="forge-sig-pad" width="420" height="140" aria-label="Signature pad"></canvas>
      <button type="button" id="forge-sig-clear" class="forge-muted">Clear</button>
    </div>
    <label class="forge-ack">
      <input type="checkbox" id="forge-acc-ack" />
      I have read and agree to this proposal and the terms above.
    </label>
    <div class="forge-actions">
      <button type="button" class="forge-submit" id="forge-acc-submit" data-forge-proposal-accept="1">Accept</button>
      <button type="button" class="forge-muted" id="forge-dec-submit" data-forge-proposal-decline="1">Decline</button>
    </div>
    <div id="forge-dec-wrap" class="forge-dec-area forge-hidden">
      <label>Optional reason <textarea id="forge-dec-reason" rows="2"></textarea></label>
      <button type="button" class="forge-submit" id="forge-dec-confirm">Confirm decline</button>
    </div>
  </div>
  <p class="forge-section-ts">This section was generated by {_esc(org_name)} on {_esc(generated)}.</p>
</section>

<div id="forge-q-modal" class="forge-modal forge-hidden" role="dialog" aria-modal="true">
  <div class="forge-modal-inner">
    <h3>Question about this section</h3>
    <input type="hidden" id="forge-q-section" value="" />
    <label>Email <input type="email" id="forge-q-email" required /></label>
    <label>Your question <textarea id="forge-q-text" rows="3" required></textarea></label>
    <div class="forge-actions">
      <button type="button" id="forge-q-send">Send</button>
      <button type="button" id="forge-q-cancel" class="forge-muted">Cancel</button>
    </div>
  </div>
</div>
"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="forge-page-id" content="{_esc(pid)}"/>
  <title>{_esc(page.title)} — Proposal</title>
  <style>
    :root {{
      --brand-primary: {primary};
      --brand-secondary: {secondary};
    }}
    body {{ font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0;
      color: #111827; background: #fafafa; line-height: 1.55; }}
    .forge-proposalshell {{ position: sticky; top: 0; z-index: 20; background: #fafafa;
      border-bottom: 1px solid #e5e7eb; padding: 0.75rem 1rem; }}
    .forge-disclaimer {{ margin: 0 0 0.5rem; font-size: 0.875rem; background: #fff7ed;
      padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #fed7aa; }}
    .forge-proposals-nav {{ display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.875rem; }}
    .forge-proposals-nav a {{ color: var(--brand-primary); text-decoration: none; }}
    .forge-proposals-hero {{ padding: 2rem 1.25rem; background: linear-gradient(135deg, #fff, #eef2ff); }}
    .forge-proposals-hero-grid {{ display: grid; grid-template-columns: 1fr; gap: 1.5rem;
      max-width: 960px; margin: 0 auto; }}
    @media (min-width: 768px) {{
      .forge-proposals-hero-grid {{ grid-template-columns: 2fr 1fr; }}
      .forge-proposals-nav {{ flex-wrap: nowrap; }}
    }}
    .forge-prop-num {{ font-size: 0.875rem; color: #4b5563; margin: 0 0 0.25rem; }}
    .forge-client-line {{ font-size: 1.125rem; }}
    .forge-meta {{ font-size: 0.8rem; color: #6b7280; }}
    .forge-org-card {{ background: #fff; padding: 1rem; border-radius: 8px;
      border: 1px solid #e5e7eb; }}
    .forge-exec-quote {{ font-family: Georgia, 'Times New Roman', serif; font-size: 1.15rem;
      margin: 1rem 0; padding-left: 1rem; border-left: 4px solid var(--brand-primary); }}
    .forge-proposals-sec {{ padding: 2rem 1.25rem; max-width: 960px; margin: 0 auto;
      position: relative; border-top: 1px solid #e5e7eb; }}
    .forge-phase-grid {{ display: grid; gap: 1rem; }}
    .forge-phase-card {{ background: #fff; padding: 1rem; border-radius: 8px; border: 1px solid #e5e7eb; }}
    .forge-price-table {{ width: 100%; border-collapse: collapse; font-size: 0.925rem; }}
    .forge-price-table th, .forge-price-table td {{ border-bottom: 1px solid #e5e7eb;
      padding: 0.5rem; text-align: left; vertical-align: top; }}
    .forge-price-table .num {{ text-align: right; white-space: nowrap; }}
    .forge-totals {{ margin-top: 1rem; padding: 1rem; background: #fff; border-radius: 8px;
      border: 2px solid var(--brand-primary); }}
    .forge-grand {{ font-size: 1.25rem; margin-top: 0.5rem; }}
    .forge-timeline-svg {{ width: 100%; max-width: 720px; height: auto; margin: 1rem 0; }}
    .forge-milestones {{ display: grid; gap: 0.75rem; }}
    details.forge-acc {{ margin: 0.5rem 0; padding: 0.5rem; background: #fff; border-radius: 6px;
      border: 1px solid #e5e7eb; }}
    .forge-accept label {{ display: block; margin: 0.5rem 0; }}
    .forge-accept input[type=text], .forge-accept input[type=email], .forge-accept textarea {{
      width: 100%; max-width: 28rem; box-sizing: border-box; padding: 0.4rem; }}
    .forge-actions {{ display: flex; gap: 0.75rem; margin-top: 0.75rem; flex-wrap: wrap; }}
    .forge-submit {{ padding: 0.55rem 1.1rem; background: var(--brand-primary); color: #fff;
      border: none; border-radius: 6px; cursor: pointer; }}
    .forge-muted {{ background: #e5e7eb; color: #111827; border: none; padding: 0.45rem 0.9rem;
      border-radius: 6px; cursor: pointer; }}
    #forge-sig-pad {{ border: 1px solid #ccc; border-radius: 6px; background: #fff; touch-action: none; }}
    .forge-hidden {{ display: none !important; }}
    .forge-ask-btn {{ position: absolute; right: 0.5rem; top: 0.5rem; width: 28px; height: 28px;
      border-radius: 999px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 700; }}
    .forge-modal {{ position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100;
      display: flex; align-items: center; justify-content: center; }}
    .forge-modal-inner {{ background: #fff; padding: 1rem; border-radius: 8px; max-width: 420px;
      width: 90%; }}
    .forge-section-ts {{ font-size: 0.75rem; color: #9ca3af; margin-top: 1rem; }}
    @media print {{
      .forge-proposalshell, .forge-ask-btn, .forge-modal {{ display: none !important; }}
      body {{ background: #fff; }}
    }}
  </style>
</head>
<body data-forge-proposal-root="1">
{body}
</body>
</html>
"""
