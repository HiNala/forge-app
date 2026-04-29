# Web canvas (V2 P-03)

The web canvas reuses the same **xyflow** substrate as the mobile canvas (`translateExtent` ±50k, minimap, dot grid ≥50% zoom, marquee hotkey `M`).

Spec alias: `components/canvas/WebCanvas.tsx` re-exports the implementation from `components/web-canvas`.

## Client components

- `apps/web/src/components/web-canvas/web-canvas.tsx` — `ReactFlowProvider` + `browserFrame` node type.
- `apps/web/src/components/web-canvas/browser-frame-node.tsx` — Three stacked preview rows (desktop 1440px, tablet 834px, mobile 390px) with macOS-style chrome. **Shared** header/footer use `forge-shared-region` + diagonal stripe on hover (“site shell”).
- `apps/web/src/lib/web-canvas-viewports.ts` — Breakpoint sizes and `scaleForCanvasRow()`.
- `apps/web/src/lib/web-marquee-hit.ts` — Marquee hit-testing against `data-forge-node-id` / `data-forge-region`.
- `apps/web/src/lib/forge-preview-hit.ts` — Shared element pick helpers + `MIN_ELEMENT_PICK_ZOOM` (75% canvas zoom).
- `apps/web/src/lib/mobile-screen-html-mutate.ts` — Duplicate/delete tagged nodes in preview HTML (web + mobile).
- `apps/web/src/lib/web-canvas-nav-graph.ts` — `normalizeWebPath`, `collectInternalNavTargetsFromHtml`, `orphanPageIds` for flow UX.
- `apps/web/src/lib/web-canvas-static-export.ts` — `buildSingleFileStaticSite()` MVP export (one HTML file with hash sections).

## Canvas features (client, shipped)

| Feature | Status |
|--------|--------|
| Breakpoint emphasis (All / Desktop / Tablet / Mobile) | Shipped |
| Marquee + refine panel (orchestration wiring = P-05) | Client shipped |
| Element pick + FAB (Refine / Duplicate / Delete) at ≥75% zoom; cross-page `<a href>` still navigates | Client shipped |
| `updatePageHtml` — edit preview HTML without re-running `buildPageHtml` | Shipped |
| Site nav modal → rebuild all pages via `buildPageHtml` | Shipped |
| Homepage flag, change path, rename, duplicate, delete | Shipped |
| Grid arrange + fit view | Shipped |
| **Sync links** — edges from internal `<a href="/path">` (data `fromNav: true`; manual edges preserved) | Shipped |
| Orphan page hint (no incoming edge, excluding homepage) | Shipped |
| Static export — single `.html` preview | Shipped |
| Static export — multi-page **ZIP** (standalone HTML + relative nav) | Shipped (`buildMultiPageStaticZip`, `fflate`) |
| Multi-page orchestration (`SiteOutline`, `WebsiteComposer`, streaming) | **API / P-05** |
| Next.js zip, Framer/Webflow JSON, Figma API, hosted multi-route site | **Pipeline** |
| Responsive linter + auto-fix | **Not started** |
| Page Detail tabs (Pages / Canvas / Flow / SEO / …) | **Partial / product** |
| In-frame link click → focus / fit target page node | **Shipped** (`requestFocusPageByPath`, `WebCanvasPendingFocus`) |
| Per-page header override | **Not started** |

## State (`useWebCanvasStore`)

- `pages`, `siteNavLinks`, `homePageId`, `nodes` / `edges`, `focusBreakpoint`, `fontPairId`, theme, brand sliders, `marqueeMode`, dialogs.

## Studio routes

- `/studio/web` — web canvas. Single-page legacy workflows remain on `/studio`.

## Tests

- `web-canvas-nav-graph.test.ts`, `web-canvas-static-export.test.ts`, `web-marquee-hit.test.ts`, `web-canvas-viewports.test.ts`.

## Related docs

- `docs/user/WEB_DESIGN_GUIDE.md` — user-facing how-to.
- `docs/architecture/MOBILE_CANVAS.md` — sibling surface for `/studio/mobile`.
- `docs/missions/V2_P03_MISSION_REPORT.md` — mission status vs acceptance criteria.
