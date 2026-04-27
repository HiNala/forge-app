# Web canvas (V2 P-03)

The web canvas reuses the same **xyflow** substrate as the mobile canvas (`translateExtent` ±50k, minimap, dot grid ≥50% zoom, marquee hotkey `M`).

## Client components

- `apps/web/src/components/web-canvas/web-canvas.tsx` — `ReactFlowProvider` + `browserFrame` node type.
- `apps/web/src/components/web-canvas/browser-frame-node.tsx` — Three stacked preview rows (desktop 1440px, tablet 834px, mobile 390px content width) with macOS-style chrome. Content is **scaled** to `WEB_CANVAS_ROW_DISPLAY_WIDTH` (380px) so nodes stay a manageable size on the canvas; layout is still computed at the true breakpoint width inside the scaled layer.
- `apps/web/src/lib/web-canvas-viewports.ts` — Breakpoint sizes and `scaleForCanvasRow()`.

## State

`useWebCanvasStore` holds `pages` (id, title, path, html), `nodes`/`edges`, `focusBreakpoint` (`all` | `desktop` | `tablet` | `mobile`), theme and brand sliders, and `siteNavEditorOpen` for the **Site nav** dialog (orchestrated editing later).

## Studio routes

- `/studio/web` — this canvas. Single-page and legacy workflows remain on `/studio` without canvas.

## Not yet in this tree

Multi-page orchestration (`SiteOutline`), `WebsiteComposer`, static/Next.js/Figma export, responsive linter, and shared-region server sync are **API and pipeline work** tracked under P-03 Phases 3+.
