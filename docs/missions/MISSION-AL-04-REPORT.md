# MISSION AL-04 — Launch sign-off (in progress)

This document tracks **AL-04** work. Many acceptance criteria (human walkthroughs, Litmus email matrix, Lighthouse ceilings, axe-zero on every route, design regression screenshots) require **scheduled time** beyond a single implementation pass. Items below mark what landed in code **now** vs what remains.

## Completed in this drop (evidence)

### Forbidden copy / positioning

- **CI-style script:** `scripts/ci/forbidden_copy_check.mjs` scans `apps/web/src` and `apps/api/app` for deprecated “page builder” phrasing (narrow scope avoids false positives in historical audit prose under `docs/`).
- **Marketing metadata:** `apps/web/src/app/(marketing)/layout.tsx` default title/description/OpenGraph updated to **mini-app platform** language.
- **`apps/web`** already had `copy:check` via `scripts/scan-forbidden-copy.mjs` (banned filler words).

### Half-wired integrations (disposition)

- **`/settings/integrations`:** Google Calendar remains the live connection. Added **HTTP webhooks** + **Zapier app** rows with **explicit roadmap** links (not “Coming soon” placeholders without context). File: `apps/web/src/app/(app)/settings/integrations/page.tsx`.
- **Public roadmap:** `apps/web/src/app/(marketing)/roadmap/page.tsx` + nav link in `marketing-nav.tsx`.

### Audit log (AL-02 / AL-03 coverage)

- **`apps/api/app/api/v1/canvas.py`:** `write_audit` on canvas project create/delete/publish/export, screen create/delete/region refine.
- **Test:** `apps/api/tests/test_audit_log_completeness.py` stringchecks for expected action names + billing still wiring `write_audit`.

### Keyboard shortcuts (incremental)

- **Dashboard:** `/` focuses search, `n` → Studio, **j/k** row focus (with existing arrows). `apps/web/src/components/dashboard/dashboard-view.tsx`.
- **Studio:** ⌘/Ctrl+Enter submits from prompt textareas where Enter already submitted; ⌘/Ctrl+S shows a lightweight “Saved” toast (draft sync confirmation). Code: `apps/web/src/components/studio/studio-workspace.tsx`.
- **Web canvas:** `onNodeDragStop` wired so screen positions persist after drag. `apps/web/src/components/web-canvas/web-canvas.tsx`.
- **Help table:** `SHORTCUTS_HELP` updated in `apps/web/src/lib/shortcuts-help.ts`.

### Product quality / lint

- **`useLastOrchestrationRunId`:** Implemented with `useSyncExternalStore` (fixes React compiler eslint `set-state-in-effect`). `apps/web/src/hooks/use-last-orchestration-run.ts`.
- **War Room:** Goal field resets via `key={page.id}` instead of syncing in `useEffect`; next-move dismissal uses **`useTickerNow`** instead of **`Date.now` in useMemo.** `apps/web/src/components/war-room/war-room-workspace.tsx`.
- **Static export tests:** **`buildMultiPageStaticFiles`** exported for deterministic asserts; avoids fragile `unzipSync` assertions under Vitest’s bundling.
- **`format/numbers`** + **`i18n`** identity stub: `apps/web/src/lib/format/numbers.ts`, `apps/web/src/lib/i18n.ts`.

## Deferred (requires follow-up schedule)

- Full **⌘Z / canvas duplicate / submissions jk** matrix, undo toasts, locale `t()` plumbing, UsageBar animation polish, internal design showcase, email client matrix, Lighthouse/axe budgets, visual regression folders, day-of walkthrough recordings, signed launch decision — **not shipped in this commit**.

## Verification commands (local)

```bash
node scripts/ci/forbidden_copy_check.mjs
node scripts/ci/stub_check.mjs
pnpm --filter web test
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint:strict
cd apps/api && python -m pytest tests/test_audit_log_completeness.py -q
```

## Launch checklist

Update `docs/LAUNCH_CHECKLIST.md` Product rows with owner initials + dates as each human gate completes.

## Sign-off

| Role | Status |
|------|--------|
| Engineering | Pending |
| Product | Pending |

**Launch decision:** Pending — complete deferred sections + human verification first.
