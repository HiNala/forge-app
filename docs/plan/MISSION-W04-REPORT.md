# Mission W-04 — Workflow integration (report)

**Branch:** `mission-w04-workflow-integration`  
**Goal:** Unify contact/booking, proposal, and pitch-deck workflows across Studio, Dashboard, page admin, analytics, onboarding, marketing entry points, and public branding.

## Delivered

- **Studio empty state:** Three flagship workflow cards (prime-only), secondary suggestion row, “most used” ordering from existing pages, `?workflow=` deep link support.
- **SSE `workflow_clarify`:** Emitted when flagship intent is low-confidence; inline, non-blocking assistant UI with two primary choices + default hint; optional `forced_workflow` on regenerate.
- **API:** `StudioGenerateRequest.forced_workflow`; `user_preferences.onboarded_for_workflow`; public HTML “Made with Forge” for trial/starter; Redis publish payload includes `org_plan` for badge correctness from cache.
- **Dashboard:** Status + workflow family filters; keyword hint row (“See all proposals →”); workflow-colored chips/icons on cards; layout-aware thumbnail object positioning.
- **Page detail:** Per-workflow tab labels via `getPageDetailConfig`; deck **`/export`** tab shell.
- **Analytics:** Workflow mix cards + links to `/analytics/pipeline` and `/analytics/engagement` when relevant counts exist.
- **Command palette / shortcuts:** Workflow quick actions; `⌘⇧C / P / D` (Ctrl+Shift on Windows) to Studio with workflow priming.
- **Onboarding:** Step 0 workflow picker with Skip; preferences persisted; finish routes to Studio with workflow when selected; signup preserves `?workflow=` through sessionStorage → onboarding.
- **Marketing:** `/workflows/contact-form`, `/workflows/proposal`, `/workflows/pitch-deck` with signup deep links.
- **Templates gallery:** Workflow-first trio linking into filtered dashboard views.
- **Docs:** `docs/architecture/WORKFLOW_FRAMEWORK.md`, `docs/workflows/OVERVIEW.md`.

## Deferred / follow-up

- Full **Kanban pipeline** data model, **deck engagement** metrics from analytics events, **tracked share links** table, **email digest** sections per workflow (depend on BI-04 + further API work).
- **Visual regression** snapshots under `apps/web/design/regression/` (run in CI separately).
- Broader **E2E** run with Clerk (see FE-02 runbook).

## Verification

- API: `uv run pytest tests/test_workflow_confidence.py` and full suite.
- Web: `pnpm run typecheck`, `lint`, `vitest run`.
