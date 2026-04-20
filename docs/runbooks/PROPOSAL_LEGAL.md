# Proposal legal guardrails (Forge)

## What Forge adds by default

Default **`legal_terms`** on new proposals state that the document is a **proposal, not a binding contract** until accepted, and include the **Forge disclaimer** that Forge is not a law firm.

## Mandatory content in generated HTML

Orchestration and **`render_proposal_html`** aim to emit:

- Visible **disclaimer** that the document is a proposal until acceptance (`proposal-not-a-contract` / “not a contract” wording).
- Clear **acceptance mechanism** copy near the action buttons (`acceptance-mechanism` region).
- **Change-order**, **cancellation**, and **governing law** language inside the terms accordion / legal block where the template includes them.
- **Warranty** (explicit period or “no warranty” when configured).
- Footer **Forge disclaimer**: Forge is not a law firm and does not provide legal advice (`forge-legal-disclaimer`).

The helper **`proposal_html_includes_mandatory_sections(html)`** checks for structural markers (`data-forge-section`, disclaimer, accept, Forge legal footer); extend it as templates evolve.

## Operator guidance

- Encourage customers to **consult a licensed attorney** for contract formation, liens, licensing, and consumer-protection rules in their jurisdiction.
- **Do not** present Forge output as legal advice.
- **Onboarding and UI copy** should reinforce that Forge is a drafting and presentation tool, not a law firm.

## What Forge does *not* guarantee

- Compliance with state or local contractor, home-improvement, or consumer statutes.
- Enforceability of e-signatures or click-wrap in a given jurisdiction (implementation captures audit fields: name, email, IP, user-agent, signature kind, timestamp).

## Related code

- `app/services/proposal_render.py` — HTML structure and section hooks.
- `app/services/proposal_service.py` — default legal/payment strings, seeding.
- Tests: `tests/test_w02_proposal_math.py` (`proposal_html_includes_mandatory_sections`, rendered markers).
