# Contractor proposal workflow

Forge stores structured proposal data per proposal page (`page_type=proposal`), serves a public reading experience, and captures accept / decline with audit metadata.

## Example Studio prompt

> I need a proposal for a 12-foot fence installation for the Johnson property — 3 days labor at $65/hour, materials $2,400, start next week.

The heuristic seeder (`seed_proposal_from_prompt`) pulls **Johnson** as the client, builds **Materials** and **Labor** line items from dollar and rate phrases, and fills scope/timeline defaults. You can edit totals and copy in Studio; **PATCH** `/api/v1/pages/{page_id}/proposal` recomputes subtotal, tax, and total server-side and refreshes `current_html`.

## Data model

- One **`proposals`** row per page (`page_id` PK), with line items, scope JSON, totals, signature fields, and optional `parent_proposal_id` for version chains (change orders).
- **`proposal_questions`** holds client questions linked to `section_ref`.
- **`proposal_templates`** includes five starter library rows (`organization_id` null, `is_system=true`) visible to every org.

## Lifecycle

1. **Draft** in Studio → publish sets **`sent`** and **`sent_at`** (when wired in publish flow).
2. First visitor hit on **`POST /p/{org}/{page}/proposal/view`** sets **`first_viewed_at`** and may move status to **`viewed`**.
3. Questions move status toward **`questioned`**.
4. **`POST …/accept`** or **`decline`** records decision metadata; accept enqueues **`proposal_pdf_render`** when Redis/arq is configured, and the worker sets **`signed_pdf_storage_key`** via `assign_signed_proposal_pdf_storage_placeholder` (binary PDF generation is still a stub).
5. **`POST …/proposal/change-order`** creates a child page + proposal; the parent becomes **`superseded`**, unanswered questions are copied to the child as reminders.
6. Cron **`expire_proposals`** (worker) calls **`expire_due_proposals`** to set **`expired`** when **`expires_at`** passes and no decision was recorded.

## APIs

- Authenticated: `GET/PATCH /api/v1/pages/{page_id}/proposal`, `GET …/proposal/pdf?version=draft|signed`, `POST /api/v1/pages/{page_id}/proposal/change-order`, `GET/POST /api/v1/proposal-templates` and `POST …/proposal-templates/{id}/use`.
- Public: `/p/{org}/{page}/proposal/view|question|accept|decline`.

## Pricing

Server recomputes **`subtotal_cents`**, **`tax_cents`**, **`total_cents`** whenever line items or **`tax_rate_bps`** change (see `app/services/proposal_service.py`).

## Verification

From `apps/api` (PostgreSQL required for integration tests):

```bash
uv run pytest tests/test_w02_proposal_math.py tests/test_w02_intent_proposal.py tests/test_w02_proposal_integration.py -q
```

## Gotchas

- CORS: the browser must be allowed to call the API origin from the public proposal host.
- Signed PDF **download** returns metadata until real file storage is wired; the **key** is written after the worker runs (or can be simulated in tests).
