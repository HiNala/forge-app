# Mission W-02 — Contractor Proposal Builder (report)

**Branch:** `mission-w02-proposal-builder`  
**Status (2026-04-18):** Partial completion with solid backend and public-read path for proposals. Large UI, full PDF/Playwright, email notifications, org analytics dashboard, and comprehensive E2E remain follow-ups.

## Delivered

### Data model & migrations

- `proposals`, `proposal_questions`, `proposal_templates` (including system seeds), `proposal_sequences`, `org_testimonials`, with RLS patterns aligned to the mission DDL.

### Services

- **Numbering:** yearly `PREFIX-YYYY-NNNN` via `proposal_sequences` and `org_proposal_prefix`.
- **Pricing:** `recompute_line_totals`, `compute_totals` (basis points tax, half-up).
- **Seeding:** `seed_proposal_from_prompt` extracts client name (“Johnson property”), materials dollars, labor days × `/hour` rate into structured line items.
- **Studio finalize:** `finalize_proposal_studio_html` runs after page flush so the `proposals` row is populated and HTML is replaced with the deterministic renderer (passes `validate_generated_html` — no stored `<script>`).

### Rendering

- **`proposal_render.render_proposal_html`:** Full document with sticky nav anchors, `data-forge-section` blocks, mandatory disclaimer / not-a-contract / acceptance mechanism / Forge legal footer, scope, exclusions, priced table, timeline SVG strip, terms accordion, acceptance UI (click / typed / drawn hooks), question modal shell.
- **`proposal_public_inject`:** Scripts injected only at **public read** time (with analytics tracker), matching the existing “no scripts in stored HTML” rule.

### API & public routes

- Authenticated `GET/PATCH` page proposal, PDF stub endpoints, change order (`POST …/proposal/change-order`) with parent `superseded`, unanswered questions copied to child, metadata flag for traceability.
- Public `POST …/proposal/view|question|accept|decline` (decline reason stored in `metadata`).
- `PATCH` proposal recomputes totals and **re-renders** `pages.current_html` from brand snapshot colors.

### Orchestration

- Pipeline runs proposal finalize + re-validates HTML after assembly.
- Refine chip strings updated toward mission examples (materials line, labor rate).

### Tests

- `tests/test_w02_proposal_math.py`: pricing math, mandatory-section heuristic, prompt seeding, rendered HTML markers.

## Not completed (tracked for follow-on)

- Full **ProposalComposer** multi-agent narrative (cover copy, jurisdiction-specific boilerplate library) beyond deterministic render + seed.
- **Resend** (or equivalent) for view/question/accept/decline/expire; in-app notifications for same.
- **Real signed PDF** in worker (Playwright render + S3); draft PDF enqueue from `GET …/proposal/pdf`.
- **Studio FE:** proposal banner, refine chips UI, line-item side editor, “save as template” UX (API exists in part).
- **Page Detail** proposal Q&A reply surface; **`/analytics/proposals`** org view.
- **Trust signals** UI (Brand Kit credentials, testimonials rendering on page).
- **Expiration job** wiring verified against production DB; **visual PDF** snapshot test in CI.
- **End-to-end** demo automated in Playwright across Next + API.

## How to verify quickly

```bash
cd apps/api && uv run pytest tests/test_w02_proposal_math.py -q
cd apps/api && uv run ruff check app/services/proposal_render.py app/services/proposal_service.py
```

## Risks / notes

- Legal copy is **boilerplate**, not jurisdiction-specific; mission runbook `docs/runbooks/PROPOSAL_LEGAL.md` remains the compliance framing for humans.
- Public proposal JS posts JSON cross-origin; `BACKEND_CORS_ORIGINS` must include the web app origin in each environment.
