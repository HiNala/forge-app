# Contractor proposal workflow

Forge stores structured proposal data per proposal page (`page_type=proposal`), serves a public reading experience, and captures accept / decline with audit metadata.

## Data model

- One **`proposals`** row per page (`page_id` PK), with line items, scope JSON, totals, signature fields, and optional `parent_proposal_id` for version chains (change orders).
- **`proposal_questions`** holds client questions linked to `section_ref`.
- **`proposal_templates`** includes five starter library rows (`organization_id` null, `is_system=true`) visible to every org.

## Lifecycle

1. **Draft** in Studio → publish sets **`sent`** and **`sent_at`**.
2. First visitor hit on **`POST /p/{org}/{page}/proposal/view`** sets **`first_viewed_at`** and may move status to **`viewed`**.
3. Questions move status toward **`questioned`**.
4. **`POST …/accept`** or **`decline`** records decision metadata; accept enqueues **`proposal_pdf_render`** for a storage key placeholder.

## APIs

- Authenticated: `GET/PATCH /api/v1/pages/{page_id}/proposal`, `GET …/proposal/pdf?version=draft|signed`, `GET/POST /api/v1/proposal-templates`.
- Public: `/p/{org}/{page}/proposal/view|question|accept|decline`.

## Pricing

Server recomputes **`subtotal_cents`**, **`tax_cents`**, **`total_cents`** whenever line items or **`tax_rate_bps`** change (see `app/services/proposal_service.py`).
