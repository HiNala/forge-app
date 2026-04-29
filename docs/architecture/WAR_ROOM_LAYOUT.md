# Architecture — Product War Room layout (BP-03)

This document describes the **Product War Room**: a four-pane Forge Studio surface (Strategy · Canvas · System) with a **Next move** strip and **Action dock**, plus **stage navigation** (idea → system → design → build → grow).

## Routing

- **`/studio`** — when `studio_war_room_layout` is **true** in user preferences, the shell redirects to `/studio/war-room/new` (no `pageId`) or `/studio/war-room/{pageId}?…` (when `pageId` is present). Append **`?legacy=1`** to force **classic Studio** (`StudioWorkspace`).
- **`/studio/war-room/new`** — pick an existing Forge **Page** to open the War Room (`GET /pages`).
- **`/studio/war-room/{pageId}`** — project-scoped workspace. Stage is stored in **`?stage=`** (`idea|system|design|build|grow`).

Feature flag resolution: `apps/web/src/lib/war-room-feature.ts` (prefs override env defaults).

## Data flow (target end-state)

1. User actions and orchestration streams update **Zustand** `useWarRoomStore` (`fourLayer`, stream phase, canvas view, system tab).
2. Panes subscribe with narrow selectors to limit re-renders (performance discipline).
3. System reads/writes reconcile with BP-01 `four_layer_output` and Layer 2 structured spec (incremental).

## Files of note

- `apps/web/src/components/war-room/war-room-workspace.tsx` — layout composition.
- `apps/web/src/stores/war-room-store.ts` — shared War Room state.
- `apps/web/src/components/war-room/war-room-tokens.css` — graphite / sand / copper / emerald tokens.

## Rollout

Stored in user JSONB: `studio_war_room_layout`. Settings → **Studio** toggles the preference. Environment keys in `.env.example` can default new sandboxes on without touching user rows.
