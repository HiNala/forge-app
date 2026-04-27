# Mobile canvas (V2 P-02)

Phone-shaped **xyflow** surface for the mobile design workflow: pan/zoom (`translateExtent` ±50k), minimap, dot grid at zoom ≥50% (hidden below to avoid moiré), marquee mode (`M` or toolbar), device presets, light/dark preview shell.

## Client components

| Path | Role |
|------|------|
| `apps/web/src/app/(app)/studio/mobile/page.tsx` | Studio route shell; mounts `MobileCanvas`. |
| `apps/web/src/components/mobile-canvas/mobile-canvas.tsx` | `ReactFlowProvider`, `phoneScreen` node type, keyboard `M` for marquee. |
| `apps/web/src/components/mobile-canvas/phone-screen-node.tsx` | Device chrome (status bar 9:41, signal/battery, home indicator), HTML preview via `dangerouslySetInnerHTML`, xyflow handles. |
| `apps/web/src/components/mobile-canvas/mobile-canvas-toolbar.tsx` | Device picker, theme, zoom + editable %, fit, marquee, add screen. |
| `apps/web/src/components/mobile-canvas/mobile-canvas-tweaks.tsx` | Brand sliders (accent, radius, density) + “apply to all”. |
| `apps/web/src/components/mobile-canvas/mobile-canvas-store.ts` | Zustand: `screens`, `nodes`/`edges`, `deviceId`, theme, marquee, tweaks. |
| `apps/web/src/lib/mobile-devices.ts` | Presets (iPhone 15 family, Pixel, etc.) — used by toolbar + node layout. |

## Shipped vs mission spec

| Area | Status |
|------|--------|
| xyflow canvas, minimap, grid, zoom, fit, device shell | **Shipped** (client demo content) |
| Marquee + tagged hits (`data-forge-node-id`, `data-forge-tappable`) | **Partial** — parity with web marquee/validator still evolving |
| Multi-screen **orchestration** (outline, parallel generation, SSE `screen.complete`) | **API / P-05** |
| Four exports (Figma, Expo, HTML, PNG) | **Not shipped** in UI |
| 40+ component catalog, drift validator, Playwright E2E | **Not shipped** |
| Page Detail tabs (canvas / flow / export / analytics) | **Product / not built** |

## Studio routes

- `/studio/mobile` — mobile canvas. Chat-first Studio on `/studio` remains for legacy single-page flows.

## Related docs

- `docs/user/MOBILE_APP_GUIDE.md` — user-facing how-to.
- `docs/missions/V2_P02_MISSION_REPORT.md` — mission status vs acceptance criteria.
