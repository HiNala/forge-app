# Mission FE-04 — Studio — report

**Branch:** `mission-fe-04-studio`  
**Date:** 2026-04-19  

## Summary

Studio is implemented in `components/studio/studio-workspace.tsx` with:

- **Empty state** — time-of-day greeting, rotating placeholders (pause on focus), large auto-sizing textarea, **six** starter chips + “Surprise me”, submit control, link to **Browse templates** (`/templates`).
- **Active / split-screen** — dark chat column (~40% width, stacks below preview &lt; `lg`), light preview with browser chrome, **Edit mode**, **Open** (draft preview tab with `?preview=true&token=` when Clerk JWT available), **Publish / Republish**, Framer **soft** spring layout.
- **Sidebar** — `setSidebarCollapsed(true)` plus **`SIDEBAR_AUTO_COLLAPSE_EVENT`** so `AppShell` also collapses the shell when Studio enters active state.
- **SSE** — `lib/sse.ts` → `/studio/generate` and `/studio/refine`; **`createChunkBuffer(60ms)`** for incremental iframe updates; reconnect banner + retry.
- **Artifact card** — `StudioPageArtifactCard` (Open / Save & exit / Copy link).
- **Refine chips** — from `html.complete.refine_suggestions` or `DEFAULT_REFINE_CHIPS`.
- **Section edit** — iframe bridge + `POST /studio/sections/edit`, undo toast, **FocusScope** trap on the floating prompt.
- **Publish** — `StudioPublishDialog` + first-publish confetti (`lib/confetti.ts`, localStorage key).
- **Persistence** — `stores/studio-store.ts` (Zustand + persist); chat draft debounced **2s**; empty-state prompt debounced to same store key `__empty__` with hydration after rehydrate.
- **Virtuoso** when message count &gt; 50.

## Verification

```bash
cd apps/web && pnpm run typecheck && pnpm run lint
pnpm exec vitest run src/lib/studio-buffer.test.ts src/lib/debounce.test.ts
```

Full Playwright flows (generate → split → section edit) require **Clerk + API**; stub SSE in a dedicated spec if needed.

## Files touched this pass

- `lib/shell-events.ts` — shared `SIDEBAR_AUTO_COLLAPSE_EVENT`.
- `components/chrome/app-shell.tsx` — listens for auto-collapse.
- `components/studio/studio-workspace.tsx` — placeholder pause on focus, empty draft persist + hydrate, preview tab `token` query, keyboard Enter for section focus, FocusScope on edit popup.

## Manual / follow-up

- Visual regression snapshots for empty vs active at 375 / 1024 / 1920.
- `?token=` on preview URL is passed for future server-side validation; same-tab **Clerk** session already enables `PDraftPreview` today.
