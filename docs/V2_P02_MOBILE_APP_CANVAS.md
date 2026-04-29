# V2 MISSION P-02 — Mobile App Design Canvas

**Goal:** Add Forge's first true visual canvas — a phone-screen design surface where the user picks "Mobile app design" and lands directly into a phone-shaped artboard. They prompt one or more screens into existence, the canvas places them automatically with smart spacing and an inferred screen flow, and the user can click any element on any screen, draw a selection rectangle around any region, and prompt a refinement scoped exactly to that region. After this mission, Forge isn't just a page generator — it's a Figma-class design tool for mobile app screens that beats Figma at the "I just want it built and to iterate fast" job, while staying compatible with Figma for handoff. The output is exportable to clean code (React Native via Expo, plain HTML/CSS for prototypes) AND to Figma layers for designers who want to refine in Figma after.

**Branch:** `mission-v2-p02-mobile-canvas`
**Prerequisites:** Orchestration missions O-01 through O-04 complete. Frontend design system F-01 in place. The component-tree rendering pattern from O-03 generalized.
**Estimated scope:** Large. New canvas infrastructure, region-selection UX, multi-screen orchestration, export pipelines, mobile-specific component library. The headline workflow that justifies the strategic reframe.

---

## Experts Consulted On This Mission

- **Bret Victor (Inventing on Principle)** — *Direct manipulation. The user should see and touch the thing they're changing, not a representation of it.*
- **Susan Kare** — *Mobile UI is iconographic at every scale. Each element earns its space.*
- **Bill Atkinson** — *MacPaint's lasso-and-marquee tradition. Region selection is half the magic of a paint program.*
- **Jonathan Ive** — *The mobile screen is a physical object. Render it that way: the device frame, the home indicator, the status bar.*
- **Figma's design language (2026)** — *Multi-screen flows, auto-layout primitives, design tokens — the standards we interoperate with for handoff.*

---

## How To Run This Mission

The hard problem here isn't generation — the orchestration layer already produces structured component trees. The hard problem is **the canvas**: rendering multiple phone-shaped artboards on an infinite zoomable surface, supporting region selection on any of them, scoping refinement prompts to exactly the selected region, and keeping the multi-screen state coherent as the user iterates.

The architectural decision: we **don't** build our own canvas engine from scratch. We use **react-flow** (or its newer fork **xyflow**) as the infinite-canvas substrate, render each phone screen as a custom node, and overlay our own selection-rectangle interaction layer on top. react-flow handles pan, zoom, viewport, mini-map, and arbitrary node positioning; we own everything inside the phone frame. This decision saves 8-12 weeks of low-value canvas engineering and lets us focus on the unique parts.

The phone frame uses real device dimensions (375×812 for iPhone 15, 393×852 for the Pro models, 412×892 for Pixel 8). The user can swap the device shell from a small toolbar.

Read user case reports for the new mobile-design persona. Read the screenshots Brian uploaded — note the conversational chat-on-the-left + canvas-on-the-right pattern, the "Tweaks" panel, the inline phone chrome. Forge's version diverges in two important ways: (1) we lead with the canvas being immediately interactive rather than chat-only, and (2) the selection rectangle for region prompting is a first-class affordance, not buried in a sidebar.

Commit on milestones: canvas substrate, single-screen rendering, multi-screen orchestration, region selection, scoped prompting, mobile component library, export pipelines, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Canvas Substrate

1. Add `@xyflow/react` to `apps/web` (the maintained successor to `react-flow`). Set up `apps/web/src/components/canvas/MobileCanvas.tsx` as the root canvas surface for the mobile-design workflow.
2. The canvas is bounded but practically infinite (pan range ±50,000px in each direction). Default zoom 100%; min 25%, max 400%. Mouse-wheel + Cmd-scroll to zoom; trackpad two-finger pan and pinch-zoom; spacebar-drag to pan.
3. Mini-map in the bottom-right showing all phone screens with the current viewport box highlighted. Click in the mini-map to jump.
4. The canvas background is a subtle dot grid at 50% zoom and above; clean blank below 50% to avoid moiré at low zoom levels. Honors reduced-motion (no animated dots).
5. A floating top toolbar (over the canvas, not inside it):
    - **Device picker** — iPhone 15, iPhone 15 Pro, iPhone 15 Pro Max, Pixel 8, Pixel 8 Pro, iPad Mini, generic 9:19.5 placeholder.
    - **Theme toggle** — light / dark preview of the screens. Updates all screens at once.
    - **Zoom buttons** + zoom percentage. Click percentage to type a value.
    - **Fit-to-view** button — frames all screens.
    - **Add screen** — opens the prompt entry inline as a new pending node.

### Phase 2 — Phone Screen Node

6. A `PhoneScreenNode` is a custom xyflow node rendering as a realistic device shell:
    - Device frame (rounded-rect, faux bezel) at chosen device dimensions.
    - Top status bar with realistic time (locked at 9:41 AM by Apple convention), 5-bar signal, full battery icon. Adapts to the chosen device's notch / Dynamic Island geometry.
    - Bottom home indicator pill (modern iPhone) or no indicator (generic 9:19.5).
    - **Inside the frame**, the actual screen content — rendered from a `MobileComponentTree` via deterministic Jinja-style templates (same pattern as O-03's web component library).
7. Each screen has:
    - A **screen title** label above the device frame (e.g., "Onboarding · Welcome").
    - A **screen menu** affordance at the top-right of the frame: rename, duplicate, delete, export this screen, copy as Figma frame.
    - A **connection points** capability — small handles on the left/right edges that let the user manually wire screens together as a flow (xyflow's edge primitive). Shipping flows are how a designer communicates a multi-step app structure.
8. The screen renders crisp at all zoom levels (vector all the way down — no rasterized previews).
9. Tap targets inside the rendered screen are interactive at zoom ≥75%: hovering an element shows a faint outline; clicking selects it (Phase 4).

### Phase 3 — Multi-Screen Generation

10. The Studio chat panel (already exists from F-04) is adapted for the mobile workflow with screen-aware affordances:
    - When the active workflow is `mobile_app`, the empty-canvas prompt example chips are mobile-flavored: "Onboarding flow with social sign-in", "Habit tracker with weekly view", "Workout app home + detail screens", "Food delivery checkout flow".
    - When the user prompts something, the orchestration layer (extended in this mission) returns one or more `MobileScreen` objects, each with a generated component tree.
11. Multi-screen prompts are common: "an onboarding flow" expects 3-5 screens. The mobile composer (added in Phase 6) handles the multi-screen case by:
    - First, an outline pass: given the prompt, what screens does this app need? Returns an ordered list of screen specs (`{title, role, content_brief}`).
    - Then, parallel screen generation (batched 3-wide).
    - Finally, layout: each new screen is placed on the canvas to the right of the previously-generated screen, with a consistent vertical baseline. xyflow handles positioning via a `Layout` strategy.
12. After generation, the canvas auto-frames to fit all new screens (zoom out as needed), so the user sees the full result.
13. Streaming: as each screen finishes, it appears on the canvas with a soft fade-in. The chat panel emits `screen.complete` SSE events the canvas listens to.

### Phase 4 — Element Selection Within A Screen

14. **Element-level selection** — clicking on any rendered element inside the phone frame (a button, a heading, a card, an input, an image) selects it.
    - Selected element gets a teal outline at 1.5px with 8px-radius corners (matching brand).
    - A small floating action menu appears next to the selected element with: **Refine**, **Duplicate**, **Delete**, **Replace** (open a component swap menu).
    - Clicking **Refine** opens a small inline prompt input ("How do you want to change this?") right next to the element. Users can type or paste an idea; submitting fires a scoped section-edit (Phase 7).
15. **Hover state** — hovering any element shows a faint dotted outline so the user knows what's clickable. Cursor changes to indicate selectability.
16. **Selection precision**: use the hit-test priority of innermost element. Clicking a button inside a card selects the button, not the card. To select the parent card, the user clicks again on a nearby part of the card or uses the up-arrow keyboard shortcut to "select parent". Pattern matches Figma and Photoshop.
17. **Multi-select** — Shift+click adds elements to the selection. Refine with multi-select asks the model to address all selected elements at once ("Make these three cards consistent").

### Phase 5 — Region Selection (The Marquee)

18. **The marquee tool** is the headline interaction the user requested ("highlight with a box like in the paint program"). Activated via:
    - Holding Cmd/Ctrl + dragging on a phone screen.
    - Or clicking a "Marquee" toggle in the floating toolbar that puts the canvas in selection mode (cursor becomes a crosshair).
    - Or pressing M (the long-standing paint-tool hotkey).
19. The marquee draws a teal rectangle as the user drags. On release:
    - The rectangle's pixel coordinates are normalized to the phone screen's coordinate space.
    - Forge identifies all rendered elements that **overlap** the marquee region (any pixel in common). These are the "marquee selection."
    - A floating prompt input appears next to the rectangle: "How do you want to change this region?" — pre-filled with a context hint ("3 elements selected: a heading, a button, and a card").
20. **Marquee refine** sends the selected element list + the bounding box + the prompt to a region-scoped section-edit (Phase 7). Critically, the model receives both:
    - The list of elements (so it knows which to modify).
    - The bounding box in the screen's layout (so spatial relationships are preserved).
    - The full screen tree (so the model maintains coherence with the rest of the screen).
21. Marquee can be **resized** before submitting — drag the corners. **Cancelled** with Esc.
22. **Edge case**: if the marquee covers the whole screen, treat it as a full-screen refine (route through the existing screen-level refine pipeline, not the region-scoped one).

### Phase 6 — Mobile Component Library

23. Build `apps/api/app/services/orchestration/components/mobile/` — the mobile-specific component catalog. Categories:
    - **Layouts**: `mobile_screen_root`, `mobile_safe_area`, `mobile_navbar`, `mobile_tabbar`, `mobile_modal`, `mobile_sheet`, `mobile_overlay`.
    - **Navigation**: `nav_back`, `nav_title`, `nav_action`, `tab_item`, `bottom_nav_item`.
    - **Lists**: `list_item_avatar_text`, `list_item_thumbnail`, `list_section_header`, `swipe_action_row`, `pull_to_refresh_indicator`.
    - **Forms**: `mobile_input_text`, `mobile_input_password`, `mobile_input_phone`, `mobile_picker`, `mobile_date_picker`, `mobile_toggle`, `mobile_segmented_control`.
    - **Actions**: `mobile_button_primary`, `mobile_button_secondary`, `mobile_button_destructive`, `mobile_button_floating`, `mobile_link`.
    - **Cards**: `mobile_card_basic`, `mobile_card_with_image`, `mobile_card_metric`, `mobile_card_action`.
    - **Feedback**: `mobile_alert`, `mobile_toast`, `mobile_loading_skeleton`, `mobile_empty_state`.
    - **Media**: `mobile_image`, `mobile_video_player`, `mobile_avatar`, `mobile_icon_block`.
    - **Onboarding**: `mobile_onboarding_card`, `mobile_progress_dots`, `mobile_paywall_card`.
24. Each component has a Pydantic prop schema and an HTML-renderable template that mimics native iOS / Android styling. Light and dark theme tokens.
25. The components have realistic dimensions — list items are 60px tall (iOS standard), nav bars are 44px, tab bars are 49px on iPhone, 56px on Android. Susan Kare's lens: the screen has to feel like a real phone screen at glance, not a desktop website squeezed into a phone shape.

### Phase 7 — Mobile Composer & Region-Scoped Editing

26. Add a `MobileComposer` to the orchestration layer. Built on the same pattern as the contact-form/proposal/deck composers from O-03 but with the mobile-specific component library and a system prompt tuned for mobile UI patterns.
27. The system prompt (`composers/mobile_app.v1.md`) emphasizes:
    - "Mobile screens are 1-2 ideas, not 10. Cut anything not earning its place."
    - "Use platform conventions — iOS sheets, Android FABs, native pickers — not novel patterns."
    - "Touch targets ≥44pt. Spacing aligns to an 8pt grid."
    - "Empty states, loading states, error states — design all three when relevant. A list always has all three."
    - "Type scales follow iOS HIG / Material — body 17pt, large title 34pt, etc."
    - Includes 3-4 hand-crafted exemplar screens (an onboarding card, a list with a swipe action, a settings screen, a paywall) with annotations on why each works.
28. **Region-scoped editing** is a new orchestration graph: `RegionEditGraph`. Inputs: the screen's full component tree, the list of selected element IDs, the bounding box, the user prompt. Output: an updated component tree where ONLY elements touching the bounding box have changed. The validator checks that elements outside the box are byte-identical.
29. The validator is critical — without it, the model often "improves" the rest of the screen unintentionally. The validator hashes each non-region element before generation and verifies it's unchanged after; if not, the refiner runs ONE pass to revert the unintended changes. Max 1 retry; the third attempt accepts the drift but flags `unscoped_drift=True` to the user.

### Phase 8 — Screen Flow & Connections

30. Users can manually draw arrows between screens to indicate flow ("login → home" / "tap card → detail"). Implemented via xyflow's edge primitive with a custom edge type:
    - A small + handle appears on the right edge of any screen on hover.
    - Drag from the + handle to the destination screen → creates a "flow" edge.
    - Edge has an optional label (single click to edit).
    - Edges have arrowheads pointing to the destination.
31. **Tap-targets imply flow** — when an element on screen A is "tap to navigate" labeled, Forge auto-suggests creating a flow edge to the most likely destination screen. Suggestion appears as a faint dotted ghost-edge with an "Add flow?" tooltip; click to confirm.
32. Flow connections inform the orchestration layer when generating new screens: if the user prompts "the tap-action on the home button" while connected, the model knows what comes before / after.
33. Flows are exported in handoff (Figma export uses Figma's flow connection feature; HTML export emits a static `screen-flow.json` artifact).

### Phase 9 — Theme & Brand Application

34. The user's brand kit (from BI-01) applies to mobile screens via the same brand-token mechanism as web pages. Primary color, accent color, font choices.
35. Mobile-specific theming additions:
    - Status bar light vs dark icons (computed from the screen's top region's average luminance).
    - Native font stack — defaults to SF Pro / Inter on iOS shell, Roboto on Android shell. Override available.
    - Corner radius scale — small / medium / large / extra-large (4 / 8 / 12 / 16 typically). Affects card and button corners platform-consistently.
36. A "Tweaks" panel in the canvas's right side (modeled after the Anthropic Claude Design surface from Brian's screenshot) — small, focused, just brand controls:
    - Accent hue slider.
    - Corner radius slider.
    - Font pair selector (5-6 curated mobile font pairs).
    - Spacing density toggle (compact / comfortable / spacious).
    - Light/dark theme toggle.
    - "Apply to all screens" / "Apply to this screen only" toggle.
    Changes preview live; auto-saved with debounce.

### Phase 10 — Export Pipelines

37. **Figma export** — the highest-value handoff path. For each screen:
    - Convert the component tree to a Figma frame structure using the Figma REST API or Figma plugin endpoint.
    - Use Figma's auto-layout primitives so the export is editable (not flattened).
    - Map our component library to Figma components — when possible, link to a Forge mobile design system Figma library so the user can "detach instance" if they want.
    - Include the screen title and any flow connections as Figma prototype connections.
    - Output: a one-click "Open in Figma" button in the Page Detail. Behind the scenes, calls the Figma API on behalf of the user (OAuth integration in BI-04 added Figma as a connected provider).
38. **React Native / Expo code export** — for users building real apps:
    - Convert each screen's component tree to JSX using mappings (mobile_button_primary → `<Pressable>` + `<Text>` with our styling baked in).
    - Output is a runnable Expo project: `app/`, `components/`, `assets/`, and a `package.json`. Run `npx expo start` and the screens render on a real device.
    - Code is clean, conventional, no Forge-specific runtime dependencies.
39. **HTML/CSS prototype export** — for shareable browser-based prototype links:
    - Each screen renders as a phone-shaped card on a single shareable URL (`/p/{slug}/preview`).
    - Tap-to-navigate works between screens.
    - Useful for sharing with teammates or stakeholders who don't have Figma.
40. **PNG/SVG screen export** — quick image export for slide decks and Slack messages. Right-click any screen → "Export as PNG/SVG."

### Phase 11 — Page-Detail Integration

41. The Page Detail surface (existing F-05) gets a workflow-specific layout for `mobile_app`:
    - **Hero**: the canvas in read-only-preview mode with all screens visible.
    - **Tabs**: Canvas (default) · Flow · Export · Analytics · Settings.
    - **Canvas tab** routes to the editable canvas (Phases 1-9).
    - **Flow tab** shows a focused view of the screen-flow graph with annotations.
    - **Export tab** has the four export options with preview previews.
    - **Analytics tab** shows mobile-design-specific metrics: which screens get viewed most in shared prototypes, average time per screen, drop-off in flow paths. The `screen_view`, `flow_traversal`, `prototype_link_open` events were added to the analytics taxonomy in GL-01 for this.

### Phase 12 — Performance & Scale

42. **Many-screen handling**: a typical app has 5-20 screens, but a complex prototype could have 50+. The canvas has to perform smoothly with 50+ phone screens.
    - Use xyflow's built-in viewport culling — screens outside the visible viewport don't render their internal HTML.
    - Below 25% zoom, screens render as low-fi thumbnails instead of full HTML — lighter CPU.
    - Throttle screen-content re-rendering during pan/zoom (only the visible screens re-layout).
43. Generation budgets:
    - Single screen generation: under 8 seconds p95.
    - 5-screen flow generation: under 25 seconds p95 (stages stream).
    - Region-scoped edit: under 4 seconds p95.
    - Full re-theme of all screens: under 6 seconds p95 (template-only, no LLM).

### Phase 13 — Tests

44. Snapshot tests for the mobile component catalog — every component renders correctly in both iOS and Android shells, light and dark.
45. Region-selection tests:
    - Marquee with no overlap → no selection, prompt input shows "0 elements selected" disabled state.
    - Marquee with partial overlap → all overlapping elements selected.
    - Marquee that covers everything → falls back to full-screen refine.
46. Unscoped-drift detection test: prompt the model with a region-scoped edit, inject a synthetic response that modifies an element OUTSIDE the bounding box, verify the validator catches and reverts the change.
47. Multi-screen orchestration test: prompt "an onboarding flow", verify 3-5 screens are generated with consistent style and content cohesion.
48. Performance test: 50 screens loaded, pan and zoom remains 60fps. Generate a 5-screen prompt, p95 < 25s.
49. Export tests: every export path (Figma, Expo, HTML, PNG) generates valid output. Figma JSON validates against the Figma file format spec. Expo project builds and runs.
50. End-to-end Playwright: user signs up, picks "Mobile app" workflow, generates 4 screens, draws marquee on a button, refines the button color, exports to Figma, verifies the Figma file URL is returned.

### Phase 14 — Documentation

51. `docs/architecture/MOBILE_CANVAS.md` — the canvas substrate, component library, region-edit pipeline.
52. `docs/user/MOBILE_APP_GUIDE.md` — user-facing how-to: prompting screens, region selection, flow editing, export options. Embedded video walkthroughs.
53. Mission report.

---

## Acceptance Criteria

- xyflow-based infinite canvas renders multiple phone screens with realistic device shells.
- Single-screen and multi-screen generation work end-to-end.
- Element selection on the canvas works at zoom ≥75% with hover affordances and floating action menus.
- Marquee region selection works via Cmd-drag, M-key toggle, or toolbar button; identifies overlapping elements correctly.
- Region-scoped refinement preserves elements outside the bounding box (validator catches drift).
- Mobile component library has 40+ components in iOS and Android shells with realistic dimensions.
- Theme/brand application via the Tweaks panel works live across all screens.
- Screen flow edges can be drawn manually; tap-target inferred suggestions appear.
- Four export pipelines produce valid output: Figma, Expo, HTML/CSS, PNG/SVG.
- Page Detail mobile-app variant shows canvas, flow, export, analytics tabs.
- Performance targets hit (50 screens at 60fps; generation latency budgets).
- All tests pass.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
