# Mobile app design in Forge

Use **Studio → Mobile design** (`/studio/mobile`) to work on phone-sized screens on an infinite canvas.

## Basics

1. **Pan:** scroll / trackpad; **Space** + drag (when not typing in a field).
2. **Zoom:** pinch or scroll with **⌘ / Ctrl**; use **− / +** and the percentage in the toolbar (click the percent to type a value). **Fit** frames all screens.
3. **Add screen:** toolbar **Add screen** creates another phone node; drag nodes to arrange.

## Device & theme

- **Device** dropdown picks a preset (e.g. iPhone 15, Pixel 8). All screens use the selected frame.
- **Light / Dark** toggles preview chrome and demo HTML variables (`--fc-*`).

## Marquee selection

- Turn on **Marquee** in the toolbar or press **M** (when focus is not in an input).
- Drag a rectangle over the preview to select a region. Refinement is recorded client-side; full orchestration hooks land with **V2-P05**.

## Flow between screens

- Connect **handles** on the left/right of a phone node to another screen to show a flow. (Demo data ships with two screens; generation expands this.)

## Tweaks panel

- Adjust **accent**, **corner radius**, and **density**; optional **apply to all** updates every screen’s preview variables.

## Exports

- Full **Figma / Expo / HTML / PNG** exports are specified in V2-P02; pipeline work is tracked in **V2-P07** and mission reports. Until then, use Studio’s other workflows for file exports where available.

## Video

- Embedded walkthroughs are optional follow-up; this page is the canonical text guide.
