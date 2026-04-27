# Web canvas (V2 P-03)

The web canvas reuses the same **xyflow** substrate as the mobile canvas (`translateExtent` ±50k, minimap, dot grid ≥50% zoom, marquee hotkey `M`).

## Client components

- `apps/web/src/components/web-canvas/web-canvas.tsx` — `ReactFlowProvider` + `browserFrame` node type.
- `apps/web/src/components/web-canvas/browser-frame-node.tsx` — Three stacked preview rows (desktop 1440px, tablet 834px, mobile 390px content width) with macOS-style chrome. Content is **scaled** to `WEB_CANVAS_ROW_DISPLAY_WIDTH` (380px) so nodes stay a manageable size on the canvas; layout is still computed at the true breakpoint width inside the scaled layer.
- `apps/web/src/lib/web-canvas-viewports.ts` — Breakpoint sizes and `scaleForCanvasRow()`.
- `apps/web/src/lib/web-marquee-hit.ts` — Collects `[data-forge-node-id]` / `[data-forge-region]` elements overlapping a viewport-space marquee; `marqueeCoverageRatio()` flags near–full-screen selections for screen-level refine.

## Marquee & region refine (client)

- **Modes:** toolbar **Marquee** toggle, **`M`** hotkey, or **⌘/Ctrl + drag** on any preview row (the overlay uses `nodrag` / `nopan` so the gesture does not pan the canvas or drag the node).
- **Tagged HTML:** `buildPageHtml` in `web-canvas-store.ts` emits stable `data-forge-node-id` / `data-forge-region` attributes so overlap hit-testing has something to target.
- **Refine panel:** After release, a floating panel captures a prompt and confirms scope (full-screen if coverage ≥ ~92%). Generation is still **orchestration/API work** (P-05); the UI records intent and surfaces a success toast.

## Site navigation

- **Site nav** dialog edits shared header links (`siteNavLinks` in `useWebCanvasStore`). **Apply** rebuilds every page’s HTML via `buildPageHtml` so previews stay consistent (demo/local state until multi-page sync ships).

## State

`useWebCanvasStore` holds `pages` (id, title, path, html), `siteNavLinks`, `nodes`/`edges`, `focusBreakpoint` (`all` | `desktop` | `tablet` | `mobile`), `fontPairId`, theme and brand sliders, `marqueeMode`, and `siteNavEditorOpen` for the **Site nav** dialog.

## Studio routes

- `/studio/web` — this canvas. Single-page and legacy workflows remain on `/studio` without canvas.

## Not yet in this tree

Multi-page orchestration (`SiteOutline`), `WebsiteComposer`, static/Next.js/Figma export, responsive linter, and shared-region server sync are **API and pipeline work** tracked under P-03 Phases 3+.
