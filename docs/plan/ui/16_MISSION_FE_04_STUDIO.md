# MISSION FE-04 — Studio: The Magic Moment

**Goal:** Build the surface that carries the entire product's value proposition. Studio is where Lucy types "I need a booking page for small jobs" and watches it appear, then clicks any part of the result to refine it. If the rest of Forge is a hotel, Studio is the front desk, the concierge, and the room service rolled into one. Every interaction here has to feel alive. This mission delivers the empty state, the split-screen active state, the SSE-streamed preview, the section-click edit flow, the chat feed, and the publishing handoff.

**Branch:** `mission-fe-04-studio`
**Prerequisites:** FE-03 complete. App shell exists. Backend Mission 03 has implemented the SSE generate, refine, and section-edit endpoints. Backend Mission 04 has implemented publish.
**Estimated scope:** Large. This is the single most important screen in Forge. Precision in interaction design matters more than anywhere else.

---

## The Mixture of Experts Lens for This Mission

- **Kay** — *"Is this product a tool, or a new medium for expression?"* Studio is the medium. The empty state is a canvas, not a dashboard.
- **Atkinson** — *"Where are the moments of joy? Does it feel responsive and fluid?"* Every SSE chunk arriving in the preview should feel like the page is building itself before Lucy's eyes.
- **Systrom** — *"How fast can users do the main action? What steps can be eliminated?"* From landing in Studio to seeing a preview: one sentence, one Enter key.
- **Jobs** — *"Does this create delight the first time someone uses it?"* Yes. Or it's not done.
- **Raskin** — *"Does the interface interrupt flow?"* No labels above the input. No "describe your page" placeholder chrome. The input IS the UI.
- **Spiegel** — *"Does this lower social pressure? Are users comfortable being themselves here?"* Lucy can type "idk like a form thing for my boss" and get a real page. The AI meets her where she is.

---

## How To Run This Mission

Read the Studio section of the uploaded `Forge_App_v6.html` carefully. Note specifically: (a) the empty-state centered layout with the greeting and chips, (b) the transition to split-screen when a generation starts, (c) the dark chat feed on the left, (d) the light preview on the right, (e) the sidebar auto-collapsing into icons-only mode.

Read User Case Flows 2 and 3 from the user case reports document. These define the exact behaviors.

Three interactions must feel magical:
1. **Empty state → first generation.** The textarea is your entire world until you hit Enter, then everything expands outward.
2. **Streaming preview.** The preview frame fills in progressively, not all at once.
3. **Section click → edit.** Hover outlines the section. Click opens a floating prompt. Type. The section crossfades into its new form.

If any of these three is even a little clumsy, the whole product reads clumsy.

Commit on milestones: empty state live, SSE wiring working, chat feed rendering, preview iframe updating, section-click edit flow, publish flow wired, refine chips working.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**

---

## TODO List

### Phase 1 — Empty State

1. Build `(app)/studio/page.tsx`. On mount, detect whether a `pageId` query param exists. If yes → load that page into Studio active state (Phase 4). If no → render the empty state.
2. Empty state: dark panel? The design direction in v6 used a dark Studio; in v2 it was light. **Default to light Studio matching the rest of the app** unless the fetched design says otherwise. Studio goes dark only in the split-screen active state.
3. Empty state layout: centered vertically and horizontally. Above the input: the Forge logo mark and a warm greeting using the user's first name — "Good morning, Lucy" / "Afternoon, Lucy" / "Evening, Lucy" based on time of day.
4. Below the greeting: a floating rounded textarea — auto-sizing, max 6 rows. Large font. Placeholder rotates through example prompts every 4 seconds (same rotation content as the marketing hero from FE-02). Placeholder disappears on focus.
5. Below the textarea: 6 suggestion chips in a horizontal row (wraps on narrow viewports): "Booking form · Contact form · Event RSVP · Daily menu · Proposal · Surprise me."
6. Clicking a chip fills the textarea with a representative prompt for that type AND auto-submits. "Surprise me" picks a random category.
7. Below the chips: a subtle "Browse templates →" link for users who'd rather start from a curated starter.
8. Enter submits (Shift+Enter inserts newline). A submit icon button at the textarea's bottom-right activates only when there's content. Loading state locks the textarea, shows a dot-pulse indicator.

### Phase 2 — Entering Active State

9. On submit: do not navigate. Transition the current Studio page from empty state to split-screen active state via Framer Motion's layout animations. The textarea shrinks and re-anchors to the bottom-left panel. The greeting fades out. The preview panel slides in from the right.
10. Simultaneously, collapse the app sidebar to icons-only if it was expanded. Emit a `sidebar:auto-collapse` event for the shell to handle.
11. The transition should take ~400ms, use the `soft` spring preset, and feel like the room rearranging itself.

### Phase 3 — Split-Screen Layout

12. Active state layout: two columns. Left column 40% wide (360px min, 480px max), right column takes remaining. Responsive: on viewports < 1024px, the layout stacks vertically with the chat below the preview.
13. Left column = the chat feed:
    - Header strip at top: small indicator ("Studio · {page.title}") and a "New page" button that resets to empty state.
    - Middle: scrollable chat feed. User messages aligned right in dark-text bubbles. Assistant messages aligned left with the Forge logo avatar. Assistant messages animate in with `fadeUp`.
    - Bottom: pinned input textarea (smaller than empty-state, same behavior). Below input: refine chips if a page has been generated.
14. Right column = the preview:
    - Top strip: fake browser chrome (traffic lights, URL bar showing the page's preview URL, Edit Mode toggle, Open-in-new-tab button, Publish button).
    - Middle: an `<iframe srcDoc={currentHtml}>` with `sandbox="allow-forms allow-same-origin allow-scripts"` (scripts allowed only because the section-edit postMessage system needs them).
    - During streaming: the iframe is overlaid with a shimmer skeleton OR shows the HTML filling in live (preferred). If the iframe can't update cleanly during stream, use a DOM-based preview div that swaps to an iframe at completion.

### Phase 4 — SSE Integration

15. Use `@microsoft/fetch-event-source` to POST to `/api/v1/studio/generate` (for new page) or `/api/v1/studio/refine` (for an existing page).
16. Handle each SSE event:
    - `intent` → show a small "Understanding what you need..." indicator in the chat feed.
    - `html.start` → transition the indicator to "Building the page..." and prime the preview iframe.
    - `html.chunk` → append to the preview's srcDoc (buffer and flush every 60ms to avoid jank).
    - `html.complete` → finalize the preview, write the assistant's Page Artifact card in the chat feed, show refine chips, navigate to `/studio?pageId={new_id}` so refresh works.
    - `error` → show an error message in the chat feed with a "try again" button; preserve the input.
17. Abort the SSE request cleanly if the user navigates away or submits a new prompt. Use AbortController.
18. Handle disconnects: if the stream drops, show a non-intrusive "Connection lost — [reconnect]" inline banner in the chat. Reconnect button retries.

### Phase 5 — Page Artifact Card

19. After a successful generation, append a card to the chat feed titled with the page name. Below the title: the page type chip and a one-line summary. Three action buttons: **Open** (opens public preview in new tab), **Save & exit** (navigates to Page Detail), **Copy link** (copies the published URL if live, or a preview URL if draft — shows a toast).
20. Card has a subtle hover lift. Card action buttons use the Button primitive, size `sm`, ghost variant.

### Phase 6 — Refine Chips

21. After generation, show 5-6 refine chips below the input: "Make it more minimal · Dark color scheme · Add pricing · Bigger CTA · Add a phone number · Change the tone."
22. Chips are context-aware — the backend returns a suggested list in the `html.complete` event based on the page type. If not provided, fall back to a default list.
23. Clicking a chip fills the input with a pre-worded prompt AND auto-submits (same pattern as the empty-state chips).

### Phase 7 — Section-Click Editing

24. The preview frame's iframe content includes sections with `data-forge-section="hero" | "form" | "cta" | ...` attributes set by the Page Composer (backend Mission 03).
25. A small script injected into the iframe (`/p/-internal/studio-bridge.js` served by our backend) listens for mouseover + click events on sections and posts them to the parent via `postMessage`. Only loaded when `?preview=studio` query param is set on the iframe URL.
26. When Edit Mode is toggled on (via the browser chrome toggle), the parent shows a dashed outline overlay on whichever section the user's cursor is over.
27. Clicking a section: a floating prompt popup appears anchored to the section's bounding box in the parent viewport. Popup has: an input pre-focused, three quick chips ("Shorter copy · Bolder headline · Different image"), and a close button.
28. Submitting the popup calls `POST /api/v1/studio/sections/edit` with `{page_id, section_id, prompt}`. While waiting: the clicked section in the preview dims with a subtle shimmer.
29. On response: the returned section HTML is spliced into the iframe's DOM via another postMessage. The section crossfades from old to new via a CSS transition on opacity, ~300ms. Other sections are never touched.
30. Undo: a small toast appears after the edit with an Undo action. Undo calls a backend endpoint (`POST /api/v1/pages/{id}/revert-last-revision`) OR tracks revisions client-side and sends the previous HTML back.

### Phase 8 — Publish Flow

31. Publish button in the browser chrome bar. When clicked:
    - If the page has never been published: open a Dialog asking for the final slug (pre-filled from the page title), with a live availability check. Dialog confirms → `POST /api/v1/pages/{id}/publish` → shows a success toast with "View live page ↗" action.
    - If already published: the button label reads "Republish" and changes publish instantly (creates a new PageVersion), toast confirms.
32. On first-ever publish (new user's first page), fire a subtle Atkinson-esque celebration — soft confetti burst from the Publish button OR a one-time dismissible celebration card in the chat feed saying "Your first page is live 🎉 [Share it]." Restraint matters; this fires once per user, ever.

### Phase 9 — Persistence & State Management

33. Studio state (current page, conversation history, draft chat input) persists to Zustand with localStorage hydration keyed by `pageId`. If Lucy closes the tab mid-refinement and reopens it, her state is intact.
34. Auto-save draft input every 2 seconds (debounced) to localStorage so she never loses a half-typed prompt.
35. On route away from Studio with unpublished changes, show a confirmation dialog (unless changes have been auto-saved as a draft on the server).

### Phase 10 — Open in New Tab

36. Open-in-new-tab button in the browser chrome opens `/p/{org.slug}/{page.slug}?preview=true&token={session_token}` in a new tab.
37. The public page at that URL checks the token against the user's session; if valid and the user has org access, it renders the draft; otherwise 404.

### Phase 11 — Accessibility

38. The iframe is labeled via `aria-label="Live page preview"`.
39. When Edit Mode is on, tab-key navigation through the parent window cycles through sections (announce section name via a live region).
40. The section-click popup traps focus. Escape closes.
41. Keyboard-only user can: submit a prompt, enter Edit Mode, tab to a section, press Enter to open the edit popup, type a prompt, submit — without ever touching the mouse.
42. Announce generation progress via an `aria-live="polite"` region ("Building page... Hero section added... Form section added... Page complete.").

### Phase 12 — Performance

43. The SSE buffer/flush pattern keeps UI jank-free even with fast chunk rates. Measure with React Profiler.
44. The iframe's srcDoc updates use a ref-based imperative update, not React re-renders, to avoid thrashing.
45. Chat feed virtualizes if it gets long (> 50 messages) using `react-virtuoso` or similar.
46. Framer Motion animations use `will-change` hints for transform/opacity only.

### Phase 13 — Tests

47. E2E: type a prompt, submit, see the split-screen transition, see the preview fill in, see the Page Artifact card, click Open, verify the preview opens in a new tab.
48. E2E: section-click edit — enter Edit Mode, click the hero, type a refinement, verify only the hero section changes.
49. Unit test: SSE buffer flushes on the expected cadence.
50. Unit test: input auto-save debounces correctly.
51. Visual regression: empty state and split-screen active state at 375 / 1024 / 1920 widths.
52. Axe-core on both states. Zero violations.
53. Mission report.

---

## Acceptance Criteria

- Empty state renders correctly with a warm greeting, rotating placeholder, and 6 suggestion chips.
- Submitting a prompt transitions Studio to split-screen with the sidebar auto-collapsed.
- SSE events stream into the preview progressively and visibly.
- Page Artifact card appears in the chat feed with working Open / Save / Copy link actions.
- Section-click editing modifies only the targeted section with a crossfade.
- Undo works for the last edit.
- Publish flow handles both first-publish and republish cases.
- Celebration fires on first-ever published page (once per user, per lifetime).
- Draft input auto-saves so reloads never lose work.
- Keyboard-only user can complete the full generation + section-edit flow.
- Mission report written.

---

## Repo tracking (living)

Current depth vs this brief: **[FRONTEND_STATUS.md](./FRONTEND_STATUS.md)** · Shipped scope: [MISSION-FE-04-REPORT.md](../MISSION-FE-04-REPORT.md)

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
