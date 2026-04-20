# Mission W-02 — Contractor Proposal Builder (report)

**Branch:** `mission-w02-proposal-builder`  
**Status (2026-04-20):** Core backend, public proposal API, deterministic HTML render, worker hooks, and automated verification for pricing, intent fallback, public flows, change orders, expiration, and signed-PDF key plumbing are in place. Email notifications, full Playwright PDF bytes + S3 upload, rich Studio line-item editor, org-wide `/analytics/proposals`, and a recorded Playwright E2E remain optional follow-ups.

## Delivered

### Data model & migrations

- `proposals`, `proposal_questions`, `proposal_templates` (including five system seeds), `proposal_sequences`, `org_testimonials`, with RLS aligned to the mission DDL.

### Services

- **Numbering:** yearly `PREFIX-YYYY-NNNN` via `proposal_sequences` and `org_proposal_prefix`.
- **Pricing:** `recompute_line_totals`, `compute_totals` (basis points tax, half-up).
- **Seeding:** `seed_proposal_from_prompt` extracts client name, materials dollars, labor days × `/hour` rate into structured line items.
- **Studio finalize:** `finalize_proposal_studio_html` replaces generic HTML with deterministic proposal markup (`validate_generated_html` — no stored `<script>`).
- **Signed PDF key:** `assign_signed_proposal_pdf_storage_placeholder` sets a deterministic storage path after acceptance (shared by API tests and `proposal_pdf_render` worker job).
- **Expiration:** `expire_due_proposals` centralizes cron logic; worker `expire_proposals` calls it.

### Rendering

- **`proposal_render.render_proposal_html`:** Document with sticky nav, `data-forge-section` blocks, mandatory disclaimer / not-a-contract / acceptance mechanism / Forge legal footer, scope, exclusions, priced table, timeline SVG strip, terms accordion, acceptance UI (click / typed / drawn hooks), question modal shell.
- **`proposal_public_inject`:** Scripts injected at **public read** time (analytics tracker), matching the no-scripts-in-stored-HTML rule.

### API & public routes

- Authenticated `GET/PATCH` page proposal, PDF meta endpoints, `POST …/proposal/change-order` (parent `superseded`, unanswered questions copied, child `parent_proposal_id`).
- Public `POST …/proposal/view|question|accept|decline`.
- Proposal templates CRUD + `POST …/use`.

### Orchestration

- Heuristic intent routes `quote` / `bid` / `estimate` keywords to `workflow=proposal` when the LLM tier is unavailable.
- Refine chip strings aligned with mission examples where implemented.

### Tests (verified)

| Area | Command |
|------|---------|
| Pricing, mandatory markers, seed, render | `uv run pytest tests/test_w02_proposal_math.py -q` |
| Intent fallback (no LLM) | `uv run pytest tests/test_w02_intent_proposal.py -q` |
| Postgres: view, question, accept ×3 kinds, decline, change order, expire, signed PDF key | `uv run pytest tests/test_w02_proposal_integration.py -q` |

Integration tests require PostgreSQL reachable with the app `DATABASE_URL` (they skip cleanly if the DB is down).

### Documentation

- `docs/workflows/CONTRACTOR_PROPOSAL.md` — lifecycle and APIs.
- `docs/runbooks/PROPOSAL_LEGAL.md` — guardrails and operator guidance.

## Follow-on (not blocking core verification)

- Multi-agent **ProposalComposer** narrative (jurisdiction-specific boilerplate library) beyond deterministic render + seed.
- **Resend** (or equivalent) for view / question / accept / decline / expire; in-app notifications for each.
- **Real PDF bytes** in worker (Playwright render + upload); draft PDF enqueue from `GET …/proposal/pdf?version=draft`.
- **Studio FE:** proposal banner, line-item side editor, “save as template” UX (templates API exists).
- **Page Detail** proposal Q&A reply surface; **`/analytics/proposals`** org dashboard.
- **Trust signals** UI (Brand Kit credentials, testimonials on public page).
- **Visual PDF** snapshot test in CI.
- **End-to-end** Playwright demo across Next + API.

## Risks / notes

- Legal copy is **boilerplate**, not jurisdiction-specific; `docs/runbooks/PROPOSAL_LEGAL.md` is the compliance framing for humans.
- Public proposal JS posts JSON cross-origin; `BACKEND_CORS_ORIGINS` must include the web app origin in each environment.
