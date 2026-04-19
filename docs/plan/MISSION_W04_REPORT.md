# Mission W-04 — Workflow integration (report)

## Summary

Integrated the three flagship workflows into the **Studio empty state**, **Dashboard**, **Page Detail**, **templates gallery**, **onboarding**, **marketing**, **command palette**, **analytics**, and **public badge** pipeline.

## What shipped

### Product

- Studio: flagship workflow cards (prime-only), secondary suggestion chips, optional `workflow_clarify` SSE UI, `?workflow=` priming.
- Dashboard: workflow type filters + keyword search hint row; workflow-colored page type chips.
- Page Detail: `getWorkflowSurfaceConfig` drives tab labels, Share/Present/Export for decks, export route stub.
- Onboarding: workflow choice + `onboarded_for_workflow` preference + redirect to Studio.
- Marketing: `/workflows/*` landing pages + home tiles; signup preserves `?workflow` through sessionStorage.
- Command palette + keyboard shortcuts for workflow entry.
- Org analytics: workflow mix cards linking to filtered dashboard.

### Backend

- `workflow_clarify` SSE event + default `page_type` bias; `workflow_hint` on `POST /studio/generate`.
- `UserPreferences.onboarded_for_workflow` (BI-04 JSON).
- `inject_made_with_forge_badge` wired in `public_runtime` (cache + live paths).

## Backlog / deferred

- Tracked share links table, email digest variants, full “Send to client” modal, QR/embed, pipeline/engagement deep pages, Playwright visual regression, presenter analytics wiring.
- `share_links` (Phase 13) and full Pro+ gating for tracked links.

## Tests

- `apps/api/tests/test_w04_workflow_clarify.py`

## Verification

- `python -m pytest tests/test_w04_workflow_clarify.py`
- Web: `pnpm exec tsc --noEmit` (recommended)
