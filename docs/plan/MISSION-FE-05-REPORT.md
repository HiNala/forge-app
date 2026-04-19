# Mission FE-05 — Dashboard, Page Detail, Submissions & Automations UI

**Branch:** `mission-fe-05-dashboard-pages`  
**Status:** Implemented (ongoing hardening per checklist below)  
**Date:** 2026-04-18  

## Summary

Forge’s managerial surfaces connect the creative Studio to operations: a **Dashboard** of page cards with filters and search in the URL, **Page Detail** with horizontal tabs only, a **Submissions** table with inline expand, bulk actions, CSV export, polling refresh, and a reply flow with brand preview, plus **Automations** with Google Calendar OAuth via popup and recent run **Retry**.

## Backend additions

- **`GET /api/v1/pages/{id}/submissions/export`** accepts optional `status` and `q` query params (aligned with the list endpoint) so exports match the current table filters and search.
- **`DELETE /api/v1/submissions/{id}`** removes a submission after deleting related `submission_replies`, `submission_files`, and `automation_runs` rows.
- **`POST /api/v1/pages/{page_id}/automations/runs/{run_id}/retry`** re-runs `AutomationEngine.run_for_submission` for failed runs.

## Frontend highlights

| Area | Behavior |
|------|----------|
| Dashboard | URL `?filter=` and `?q=` (debounced), card hover actions, unread badge, load more, keyboard arrows / Enter / E |
| Submissions | URL `?status=`, `?q=`, `?expand=`; select-all; bulk read / archive / delete (typed `delete` for 10+); Raw JSON dialog; 30s poll + pulse on new rows; CSV export uses current filters |
| Reply | Draft regenerate, send, error toast with retry, optional brand preview block |
| Automations | Debounced auto-save; `window.open` OAuth (no `noopener` so the opener receives `postMessage`); popup close detection for “cancelled”; run list with Retry |
| OAuth close | `forge:calendar` messages on `/oauth/calendar-popup-close` |

## Verification commands

| Check | Command |
|--------|---------|
| Web types | `cd apps/web && pnpm exec tsc --noEmit` |
| Web lint (touched files) | `cd apps/web && pnpm exec eslint src/components/dashboard/ src/components/submissions/` |
| API tests | `cd apps/api && uv run pytest tests/` (Postgres-backed tests skip if DB unavailable) |

## Mission checklist — remaining / follow-ups

- **SSE** `/submissions/stream`: not implemented; **polling every 30s** is in place.
- **E2E** scenarios 55–58 in the brief need a stable Clerk + API env; extend Playwright when CI secrets exist.
- **Visual regression + axe** on Dashboard / Page Detail / Submissions: run in CI when baselines exist.
- **Single-message calendar** contract: opener listens for `forge:calendar`; a separate `calendar:connected` alias can be added if external tools expect it.
- **Bulk archive undo**: not implemented (toast-only success).

## Notes

- CSV filename comes from `Content-Disposition` when present.
- Keyboard shortcuts are documented in `SHORTCUTS_HELP` (`use-shortcuts.ts`) and implemented for Dashboard and Submissions where noted.
