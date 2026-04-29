# MISSION BP-03 — Product War Room (report)

Branch: **`mission-bp03-product-war-room`** (recommended).

## Delivered this iteration

- **Feature flag**: `studio_war_room_layout` on `UserPreferences` (API) + **Settings → Studio** toggle; env fallbacks **`NEXT_PUBLIC_DEFAULT_STUDIO_WAR_ROOM_LAYOUT`**, **`NEXT_PUBLIC_WAR_ROOM_DOGFOOD_DEFAULT`** documented in `.env.example`.
- **Routing**: `/studio` → **`StudioGate`** redirects to **`/studio/war-room/new`** or **`/studio/war-room/{pageId}`** preserving query params (`pageId`, `workflow`, …). **`?legacy=1`** restores classic **`StudioWorkspace`**.
- **Layout scaffolding**: graphite/sand/copper/emerald CSS tokens **`war-room-tokens.css`**; **`WarRoomWorkspace`** composes Strategy / Canvas / System, **Next move** heuristic strip, Action dock (Deploy / Simulate / Page detail / Legacy), stage nav syncing **`?stage=`**, mobile Tabs plus `<1100px` collapse, IDEA stage hides System via grid CSS.
- **State**: **`useWarRoomStore`** (`fourLayer`, stages, overlay toggles).
- **Next move**: client **`computeNextMoves`** + dismissal model (session persistence) + Vitest unit tests.
- **Simulate / agents**: Simulate panel stub; multi-agent drawer reads **`last_review_report.findings`** defensively where present.
- **Docs**: `docs/architecture/WAR_ROOM_LAYOUT.md`, `NEXT_MOVE_ENGINE.md`, `SIMULATE_MODE.md`, `docs/user/WAR_ROOM_GUIDE.md`, `docs/marketing/POSITIONING_AGAINST_CLAUDE_DESIGN.md`, plus this report.
- **Tests**: `apps/web/src/lib/next-move-engine.test.ts` (Vitest). Playwright `apps/web/e2e/war-room-layout.spec.ts` skeleton (**skipped** until CI auth bootstrap).

## Deferred (mission scope exceeds single PR)

SSE pane streaming, **`flow_edges`** connectors, editable **system**, server NextMove analytics loop, Simulate LLM personas + persisted runs + credits, layered heatmaps, multi-agent Discuss turns with spend caps, single-screen mobile overlays, Lighthouse/visual baselines **≥85/100 budgets**, onboarding ghost banners, hero asset reshoot — ship iteratively behind the same prefs.

## Acceptance snapshot

Four-pane shell + staging + heuristic Next move delivered; Simulate/engine/overlays/agent chat/SRE verification remain staged workstreams.
