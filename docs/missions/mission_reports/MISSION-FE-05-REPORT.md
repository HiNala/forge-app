# Mission FE-05 — Dashboard, Page Detail, Submissions & Automations — report

**Branch:** `mission-fe-05-dashboard-pages`  
**Date:** 2026-04-19  

## Summary

The managerial surface is implemented in the app routes under `(app)/`: **Dashboard** (`components/dashboard/*`), **Page Detail** shell (`app/(app)/pages/[pageId]/layout.tsx` + `providers/page-detail-provider.tsx`), **Overview** tab, **Submissions** (`components/submissions/submissions-panel.tsx`), **Automations** (`app/(app)/pages/[pageId]/automations/page.tsx`), and **Analytics** stub.

| Area | Implementation notes |
|------|----------------------|
| Dashboard | `PageHeader` + **Open Studio ↗**, filter chips + URL `?filter=`, search + `?q=` (250ms debounce), responsive card grid, unread badge, card actions, infinite “Load more” (24), empty + filter-empty states, **6-card skeleton** while the first `listPages` fetch is in flight |
| Page cards | `DashboardPageCard` — optional **`preview_image_url`** on `PageOut` with `next/image` (external URLs use `unoptimized`); gradient fallback |
| Page Detail | Breadcrumb, status, **Edit in Studio** / **Open live** / overflow (Duplicate, Archive, Delete placeholder), **horizontal tabs** with Framer **`layoutId`** sliding indicator (`LayoutGroup`) |
| Submissions | Inline expand, filters + search, CSV export, bulk bar, reply dialog + regenerate draft, raw JSON, 30s poll + new-row pulse, keyboard (↑↓ Enter Esc R A), permalink `…/submissions/[id]` → `?expand=` |
| Automations | Cards for notify / confirmation / calendar, debounced save, Google connect flow, recent runs + retry |
| Shortcuts | `hooks/use-shortcuts.ts` — dashboard + submissions keys documented in **?** dialog |

## Verification

```bash
cd apps/web && pnpm run typecheck && pnpm run lint
pnpm exec vitest run
```

Full E2E (publish → anonymous submit → table, reply, bulk, OAuth) requires **API + Clerk + Resend** as noted in backend missions.

## Follow-up (not blocking)

- Backend: expose `preview_image_url` on `GET /pages` list when screenshot worker lands.
- E2E suite from mission checklist (items 55–60) — add when CI has stable fixtures.
