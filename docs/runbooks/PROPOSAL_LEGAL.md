# Proposal legal guardrails (Forge)

## What Forge adds by default

Default **`legal_terms`** on new proposals state that the document is a **proposal, not a binding contract** until accepted, and include the **Forge disclaimer** that Forge is not a law firm.

## Mandatory content in generated HTML

Orchestration should emit:

- Visible **disclaimer** that the document is a proposal until acceptance.
- Clear **acceptance mechanism** copy near the action buttons.
- Standard **change-order**, **cancellation**, and **governing law** blocks adapted from org settings where available.

The helper `proposal_html_includes_mandatory_sections(html)` checks for structural markers; extend it as templates evolve.

## Operator guidance

- Encourage customers to **consult a licensed attorney** for contract formation, liens, licensing, and consumer-protection rules in their jurisdiction.
- **Do not** present Forge output as legal advice.
