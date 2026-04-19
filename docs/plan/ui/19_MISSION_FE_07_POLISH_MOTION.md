# MISSION FE-07 — Polish, Micro-Interactions, Accessibility & Performance

**Goal:** Take every screen built in FE-01 through FE-06 and make it feel alive. Every button press, every card hover, every tab change, every list mutation gets a considered micro-interaction. Every keyboard interaction is tight. Every loading moment is purposeful. Every empty state is warm. Every performance target from the PRD is met or exceeded. Every WCAG AA checkpoint passes. After this mission, the frontend stops being "a working product" and becomes "a product people want to use."

**Branch:** `mission-fe-07-polish`
**Prerequisites:** FE-01 through FE-06 complete. Every screen exists and functions correctly.
**Estimated scope:** Wide but shallow. Touches every file. No new features. Only refinement.

---

## The Mixture of Experts Lens for This Mission

Every master applies here, but the ones to lean hardest on:

- **Atkinson** — *"Does it feel responsive and fluid? Does the product reward curiosity?"* Every hover, every click, every scroll is a chance to add delight.
- **Jobs** — *"Does this create delight the first time someone uses it?"* The product should pass the "show it to my mom" test.
- **Ive** — *"Does this respect the user's attention?"* Motion that doesn't serve the user is noise. Restraint matters more than flourish.
- **Fadell** — *"What happens before and after use? Where are hidden frictions?"* The moments between moments — transitioning between screens, arriving at an empty state — are where good products separate from great ones.
- **Norman** — *"What mental model will users form about this?"* Micro-interactions reinforce the model. A card that lifts on hover says "I'm clickable" without a word.
- **Nielsen** — *"Is feedback immediate and clear?"* Every mutation gets a response within 100ms — even if the actual work is slow, the UI acknowledges instantly.
- **Engelbart** — *"Does it help groups solve complex problems together?"* Polish includes collaborative touches — presence indicators, activity feeds, attribution.

---

## How To Run This Mission

The discipline for this mission is different from every one before it. Do not read requirements and add features. Open the product and USE it. Click every button. Press every key. Fill every form with extreme inputs (emoji-only, very long strings, empty values). Resize every window. Try every flow on mobile. Disable JavaScript. Turn on a screen reader. Everything you notice that's a little wrong — fix it.

The polish pass is also the last chance to remove things. If a section, a variant, a setting, or a visual element isn't pulling weight, delete it. A product gets better in this mission both by addition and by subtraction.

Commit on each sweep boundary: motion sweep, accessibility sweep, performance sweep, empty states sweep, keyboard sweep, error states sweep, copy sweep, mobile sweep, final QA pass.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**

---

## TODO List

### Phase 1 — Motion Sweep

1. **Every interactive element has a considered state transition.** Audit Button, Card, Input, Tab, Chip, Row, Avatar. Each must have defined states for: idle, hover, focus-visible, active/pressed, disabled, loading, error/invalid. Use the motion presets from FE-01 — no ad-hoc transitions.
2. Button active press: `scale(0.97)` using the `snappy` spring preset from FE-01. Duration ~120ms.
3. Card hover: `translateY(-2px)` + shadow step-up, `240ms`, `ease-out`. Only on cards marked `hoverable`. Non-hoverable cards stay flat.
4. Tab switch: sliding indicator via `layoutId`, `300ms`, `ease-spring`. Content below the tabs crossfades (`fadeIn` 180ms).
5. Dialog / Sheet / Toast: enter with `fadeUp` or `scaleIn` per the design tokens. Exit with reverse. Never snap.
6. List mutations: when a new row is added (new submission arrives, new page created), it animates in with `fadeUp` with a one-time highlight pulse (subtle accent-tinted background fade over 800ms).
7. Sidebar collapse/expand: the width transition is accompanied by icon labels fading out/in with `fadeIn` timed with the width animation.
8. Studio split-screen entry: the empty-state textarea shrinks and repositions to the bottom-left panel via Framer Motion's `layout` animation with the `soft` spring. Preview slides in from the right.
9. Section edit crossfade: when a section updates in the Studio preview, the old and new HTML are stacked with `position: absolute`; old fades out while new fades in over 300ms. No visual jump.
10. Confetti on first-ever publish (one-time per user, per lifetime, per PRD): 15-20 pastel particles, tokens from the design system, fall + fade over 2s. Use `canvas-confetti` or equivalent.
11. Dot-pulse loading indicator for Studio generation progress: three dots, staggered sine-wave opacity animation (`ease-in-out`, 1s loop, 0.2s stagger).
12. Input focus ring: 3px glow with 200ms ease-out growth on focus; 150ms shrink on blur.
13. **Respect `prefers-reduced-motion`**: every animation shortens to 10ms or disables entirely when the media query matches. The motion library from FE-01 already supports this — verify every animation in the app honors it.
14. No animation exceeds 600ms unless it's a celebration moment (confetti, first-publish banner).

### Phase 2 — Empty States

15. Every list view has a considered empty state. Audit: Dashboard (no pages), Submissions table (no submissions), Analytics (no events for range), Team (only the current user), Integrations (none connected), Invoices (none yet), Automation runs (no runs yet), Versions list (first version), Search results (no matches).
16. Empty state components include: a small illustrative icon or warm background, a serif headline ("Your page is lonely"), a one-line description, and a clear CTA where actionable.
17. Empty states are never generic. Each speaks to the specific context. "No submissions yet — share your page to get started" is better than "No data."
18. Loading states use skeletons shaped like the expected content, not generic spinners. Exception: button-internal loading uses a small spinner.

### Phase 3 — Error States

19. Every mutation has a considered error path. Audit every mutation: page create, page publish, submission reply, automation save, team invite, brand save, billing checkout, calendar connect.
20. Error toast wording: specific and actionable. "Couldn't reach Google Calendar. Check your connection and try again" — not "Error: 500."
21. Validation errors appear inline next to the field, not in a toast.
22. Network errors: show a reconnection banner at the top of the screen. Retry button. Disappears when connectivity returns.
23. 404s: custom 404 page with the Forge voice. Warm, helpful, with links back to the Dashboard.
24. 500s: custom 500 page. Show the Sentry error ID so support can correlate. Never leak stack traces.
25. React Error Boundary wraps the main content area and catches render errors. Shows a friendly fallback with a reload button.

### Phase 4 — Accessibility (WCAG AA)

26. Run axe-core against every route in the app. Every single route. Fix every violation.
27. Keyboard navigation: Tab through every screen. Focus order must be logical. Focus must be visibly indicated on every interactive element.
28. Every button, link, and form field has a reachable, descriptive accessible name.
29. Every image has `alt` text (or `alt=""` for decorative).
30. Every form field has an associated `<label>` (visible or sr-only).
31. Color contrast: run the contrast checker on every text-over-color combination. Minimum 4.5:1 for body text, 3:1 for UI chrome. Adjust tokens if needed — never adjust specific instances, always the token.
32. Modal focus trap: Dialog and Sheet must trap focus and restore it on close. Escape key must close.
33. Live regions: progress updates (Studio generation, automation status, save confirmations) use `aria-live="polite"`. Error toasts use `aria-live="assertive"`.
34. Forms have proper landmarks: `<main>`, `<nav>`, `<aside>`. Page has an `<h1>`. Heading hierarchy is correct (no h1 → h3 skips).
35. Skip-to-content link at the top of every page, visible on focus only.
36. Screen reader test with VoiceOver (Safari) and NVDA (Windows) on the critical flows: signup, create a page, submit a form on a public page. File tickets and fix.

### Phase 5 — Keyboard & Command Palette

37. Implement the `Cmd+K` / `Ctrl+K` command palette that FE-03 stubbed. Fuzzy-search across: pages, team members, settings tabs, core actions ("Create page," "Invite teammate," "View billing").
38. Selecting an action navigates or opens the relevant surface.
39. The palette shows recent items when opened without a query.
40. Hotkey cheat sheet (`?`): lists every shortcut grouped by context.

### Phase 6 — Mobile Polish

41. Every screen works on a 375px-wide viewport. No horizontal scroll anywhere.
42. Sidebar on mobile: slides in as a Sheet (hamburger icon in a top bar), not permanently docked.
43. Tables on mobile: switch to card layout per row.
44. Studio on mobile: chat feed and preview stack vertically, not side-by-side. The preview iframe is resizable via a drag handle.
45. Section-click editing on mobile: long-press activates Edit Mode; tap-and-hold shows the outline; tap-to-select opens the prompt popup.
46. Forms on mobile: inputs use appropriate `inputmode` (`email`, `tel`, `numeric`) for better keyboards.
47. Touch targets ≥ 44px everywhere.
48. iOS safe-area insets respected (`env(safe-area-inset-bottom)`).
49. Disable tap highlight on non-interactive elements.

### Phase 7 — Performance

50. Lighthouse on every route: mobile ≥ 85, desktop ≥ 95 for authenticated app routes. Marketing routes ≥ 95 mobile, ≥ 98 desktop.
51. Published page Lighthouse ≥ 95 mobile (unchanged from Mission 04 target, verify still holds after design integration).
52. Bundle analysis with `@next/bundle-analyzer`. Every route's bundle documented. Shared bundle ≤ 180KB gzipped. Per-route incremental bundle ≤ 100KB gzipped.
53. Code-split heavy dependencies: Recharts only loads on Analytics screens; Framer Motion's more complex pieces (`layoutId`) only load where used.
54. Image optimization: every image uses `next/image`. Thumbnails for page previews are generated server-side at the exact dimensions needed (not resized in browser).
55. Font loading: only the weights actually used. `font-display: swap`. Preload only the display font.
56. Cache headers: static assets cache 1 year; API responses follow backend's `Cache-Control`. Service Worker NOT used in MVP.
57. Core Web Vitals per route in production (measured over 7 days post-launch): LCP < 2.5s, INP < 200ms, CLS < 0.1.

### Phase 8 — Copy Audit

58. Read every user-facing string in the app. Rewrite anything that sounds like a developer wrote it. The voice: Lucy's smart, kind coworker — direct, helpful, never condescending.
59. Button labels are verbs. "Publish," not "Submit." "Invite teammate," not "Add user."
60. Error messages are actionable. "This slug is already in use — try `{suggestion}`" beats "Validation error."
61. Onboarding copy is warm and quick. No tutorial text blocks.
62. Empty state copy is specific. "Your first submission will appear here" beats "No data."
63. Tooltips are concise and never repeat the label they're tooltipping.

### Phase 9 — Micro-Details

64. Selection color: when the user selects text, use the accent color with white text.
65. Scroll-into-view for newly appended items (new submission rows, new chat messages) — `scrollIntoView({behavior: 'smooth', block: 'nearest'})`.
66. When an input has an error, scroll to it on form submit.
67. When a dialog opens, focus the primary input.
68. When a dialog closes, focus returns to the element that opened it.
69. Clipboard copies show a brief inline "Copied!" indicator on the button that triggered them, not a toast (less intrusive).
70. URLs in text are auto-linkified in submission details and reply previews.
71. Dates are shown in the user's timezone with relative phrasing ("2 hours ago") for recent and absolute for distant ("Mar 12, 2026").
72. Numbers ≥ 1000 format with commas. Percents round to 1 decimal.
73. File sizes use sensible units (KB / MB / GB).
74. Long strings truncate with ellipsis and show full text on hover via tooltip.
75. Every async action that takes >500ms shows a loading state.
76. Every async action that takes >3s shows a progress indicator.

### Phase 10 — Visual Polish

77. Review every screen side-by-side with the fetched design artifact from FE-01. Flag and fix any divergences.
78. Spacing rhythm audit: every vertical gap uses a token value. No ad-hoc `24px`. 
79. Color use audit: every color in the app comes from a token. No ad-hoc hex codes anywhere.
80. Border radius audit: every corner uses a radius token.
81. Shadows audit: every shadow uses a shadow token.
82. Photography / illustration: if the design includes any custom artwork, ensure it's exported as optimized SVG (where possible) or AVIF with WebP fallback.

### Phase 11 — Final QA Pass

83. Run through every user case flow from the user case reports document end-to-end. Log any friction and fix.
84. Run Lighthouse on every route. Document final scores in `docs/polish/LIGHTHOUSE.md`.
85. Run axe-core on every route. Document zero violations in `docs/polish/ACCESSIBILITY.md`.
86. Run bundle analyzer. Document bundle sizes in `docs/polish/BUNDLES.md`.
87. Run visual regression on every screen at 375 / 768 / 1280 / 1920 widths. No unintended changes vs the FE-01 baseline.
88. Manual smoke test on real devices: iPhone SE, iPhone 15 Pro, iPad, MacBook, 27" display, low-end Android (Pixel 6a or equivalent simulator).
89. Final mission report listing: everything that was polished, every bug fixed, every piece of dead code removed, every token renamed, every accessibility issue resolved, every performance improvement measured.

---

## Acceptance Criteria

- Every interactive element has considered motion states using the shared presets.
- Every empty state and error state is specific, warm, and actionable.
- Zero axe-core violations across every route.
- Lighthouse: marketing ≥ 95 mobile / ≥ 98 desktop; app ≥ 85 mobile / ≥ 95 desktop; published pages ≥ 95 mobile.
- Core Web Vitals pass.
- Bundle sizes within the documented budgets.
- Keyboard-only flows work end-to-end on the critical paths.
- Mobile experience is first-class, not a shrunken desktop.
- Command palette (`Cmd+K`) works and is keyboard-accessible.
- `prefers-reduced-motion` fully respected.
- Copy voice is consistent, direct, and warm throughout.
- No ad-hoc values — every color, spacing, radius, shadow, motion pulls from tokens.
- Mission report written.

---

## Repo tracking (living)

Current depth vs this brief: **[FRONTEND_STATUS.md](./FRONTEND_STATUS.md)** · Shipped scope: [MISSION-FE-07-REPORT.md](../MISSION-FE-07-REPORT.md) · Polish checklists: [../../polish/](../../polish/) (Lighthouse, a11y, bundles templates)

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**

---

## A Final Note for the Agent

This mission is the one where the product gets its soul. You will not find all the work in the TODO list above — you will find the rest by using the product with care. Put on headphones, open the app, and click around like a curious user. Every time you catch yourself thinking "hm, that's a little weird" or "that felt slow" or "I don't know what that button does" — write it down and fix it.

Forge is not a product that survives on features. It survives on the feeling of being held by a careful hand. This mission is where that feeling gets built in.
