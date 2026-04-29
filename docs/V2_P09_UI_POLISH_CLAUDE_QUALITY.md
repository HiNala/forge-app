# V2 MISSION P-09 — UI/UX Polish: The Claude-Quality Pass

**Goal:** Take Forge through a comprehensive UI/UX polish pass with one specific reference for taste and feel: the way Anthropic's Claude.ai itself looks and behaves. Not because we want to copy Claude, but because Claude has solved a hard problem Forge needs to solve — making AI-powered software feel professional, calm, and trustworthy without being cold or sterile. Warm terracotta-and-cream palette, generous whitespace, restrained motion, type that breathes, almost no decorative chrome, and clear progress indicators (like the percentage bars in the usage screen the founder sees when planning Forge's pricing tiers). After this mission, Forge has the same "professional and fun, clear and obvious" quality Claude has: a stranger landing on it should feel like they're using something thoughtful, not aggressive; like talking with a calm collaborator, not a cluttered SaaS dashboard.

**Branch:** `mission-v2-p09-ui-polish`
**Prerequisites:** All structural missions (BI, O, W, GL, V2-P01 through V2-P08) complete or in flight. The product's surfaces all exist; this mission re-touches every one of them through a single coherent design lens.
**Estimated scope:** Large in surface area, small in code per surface. The work is detail and consistency, not invention. Allocate two solid days minimum for one engineer to walk every screen, plus one designer's review at the end.

---

## Experts Consulted On This Mission

- **Dieter Rams** — *"Less, but better." Cut every element that isn't earning its place.*
- **Jonathan Ive** — *Subtraction is the primary tool. The right amount of nothing.*
- **Susan Kare** — *Warmth at every scale. The interface should feel made by humans, for humans.*
- **Bill Atkinson** — *The interface is alive when it responds; dead when it stutters or freezes.*
- **Jakob Nielsen** — *Consistency. Visibility. Match between system and real world. Recognition over recall. Aesthetic and minimalist design.*
- **Anthropic's design lead** — *Calm authority. Warmth without saccharine. Clarity at every scale.*

---

## How To Run This Mission

The reference Brian named is the Claude.ai interface. Examine what makes it work, then apply the principles — not the exact pixels.

**What Claude does well:**
- **Warm, neutral palette.** Terracotta accent (`oklch(0.70 0.14 45)` or close) on a cream background (`oklch(0.97 0.02 70)` or close); evening-warm dark mode. Forge's existing palette is in the same family — keep it; tighten consistency.
- **Generous whitespace.** Sidebar items have real breathing room; messages have margin; cards aren't crammed.
- **Type that breathes.** Body type at a comfortable reading size; line-height that doesn't crowd; font weights restrained (regular and medium do most of the work; bold is rare).
- **Almost no decorative chrome.** No gradient borders, no shadow stacks, no patterned backgrounds. Just content, in a frame, in a sidebar, in a window.
- **Honest progress indicators.** The usage page shows simple percentage bars — clear, calm, accurate. No animation that distracts from the number.
- **Restrained motion.** Sidebar collapse animates. Modal entry animates. That's about it. No bouncy onboarding, no animated illustrations, no parallax.
- **Clear hierarchy.** Headings are larger but not enormous. Body is body. Captions are noticeably smaller but legible. Three sizes do most of the work.
- **Calm errors.** Errors say what happened in one short sentence and what to do next. No red banners with five exclamation points.

**What we explicitly do not copy:**
- The Claude product layout. We're not cloning Claude.ai's chat-first sidebar layout; Forge is a builder, not a chat product.
- The Claude logo or brand identity. Forge has its own brand.
- Specific copy or microcopy that's distinctively Anthropic-voiced (e.g., references to "research preview," specific Anthropic feature names).

**The discipline:** consistency over invention. Most fixes in this mission are corrections, not creations. Every surface gets the same treatment — same scale, same spacing, same accent usage.

Commit on milestones: design tokens audit, component library audit, page-by-page polish, motion review, copy review, usage-bar UX, dark mode polish, accessibility regression, mission report.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Design Tokens & Foundation Audit

1. Open `apps/web/src/styles/tokens.css` (or wherever F-01 placed the design tokens). Audit every CSS custom property and confirm consistency with the principles above. Specific tightening:
    - **Background scale:** light mode `--bg-base` (cream), `--bg-raised` (1-2% darker for cards), `--bg-overlay` (slightly deeper for dialogs); dark mode equivalents (warm dark, not cold black). Three layers, no more.
    - **Foreground scale:** `--fg-strong` (headings, primary), `--fg-default` (body), `--fg-muted` (captions, hints), `--fg-faint` (disabled, very secondary). Four layers, no more.
    - **Accent:** single `--accent-primary` and a subtle `--accent-tint` (10% of primary, for hover/focus rings). No "secondary accent." Forge picks one color and lives with it.
    - **Border:** `--border-subtle` and `--border-strong`. Two values.
    - **Radius:** `--radius-sm` (6px), `--radius-md` (10px), `--radius-lg` (14px), `--radius-pill` (full). No others.
    - **Spacing:** stick to a consistent 4-pt scale (4, 8, 12, 16, 20, 24, 32, 40, 56, 72). Audit every component for off-grid spacing values.
2. Generate a "tokens snapshot" image (a single-page HTML route at `/internal/design/tokens` that lays out every token with its name, value, swatch, and a usage note). Reference for everyone working in the codebase.
3. Audit the tokens file for orphans — values defined but never referenced. Delete them. The token sheet is short and earned.

### Phase 2 — Typography Pass

4. Establish a strict type scale and stop using inline styles or arbitrary text-XX classes. Five sizes for almost everything:
    - **Display** (hero headlines, page titles): 28-32px, Cormorant Garamond 600, line-height 1.2, used sparingly.
    - **Heading** (section headers): 20-22px, Manrope 600, line-height 1.3.
    - **Subhead** (card titles): 16px, Manrope 600, line-height 1.4.
    - **Body**: 15px, Manrope 400, line-height 1.55. The default for almost everything.
    - **Caption**: 13px, Manrope 400, color `--fg-muted`, line-height 1.4.
5. Code labels, badges, and chips: 12-13px, Manrope 500, slight letter-spacing (0.02em).
6. **Cormorant is rare.** It appears on the marketing homepage hero, on the deck slide titles, on the proposal cover, on the single page-title display in app surfaces. Everywhere else is Manrope. The discipline is restraint.
7. Walk every page in the app and identify any text that breaks the scale — a `text-lg`, an `font-bold` with no variable backing, an inline `font-size: 18px`. Replace.
8. Vertical rhythm: line-height stays consistent. A heading-then-body block should have a deterministic gap (12-16px), never inconsistent margins from one component to another.
9. Reading width: long-form text (proposal sections, FAQ answers, blog posts, product copy) caps at ~70 characters per line via `max-w-prose` or equivalent. Improves readability immediately.

### Phase 3 — Color Pass

10. Audit every component for hardcoded colors. Grep `#[0-9a-fA-F]{3,6}` outside of the tokens file. Every match is a bug; replace with a token.
11. Reduce overall color use. Forge already favors warm cream + teal/terracotta; tighten further:
    - **Status semantics**: success (one specific green token), warning (one yellow), danger (one red), info (one muted blue). Each used only on functional UI (toasts, badges, validation states). Never decorative.
    - **Chart palette**: a single five-color palette (terracotta + four warm-derived neutrals like sand, slate, sage, copper). Apply to every chart in Analytics + Admin. Stop using Recharts default rainbow.
12. Buttons:
    - **Primary**: filled accent, white text. One shape and shade across the product.
    - **Secondary**: ghost (transparent background, accent border + text). Used for non-primary actions.
    - **Tertiary**: text-only, accent color, underline on hover. For inline actions.
    - **Destructive**: subtle red text, no fill. Solid red fill ONLY on confirmation dialogs after the user has committed. Avoids visual noise from frequently-shown delete buttons.
13. Hover/focus: a single hover treatment (4% darken on backgrounds, accent ring on focus). No color shifts that change a component's identity.

### Phase 4 — Spacing & Density Pass

14. Walk every screen and verify that every block has appropriate breathing room.
    - **Card padding**: 20-24px on small cards, 28-32px on large cards. No 12px-padding cards anywhere — they look cramped.
    - **Form rows**: 16-20px vertical gap between fields. Less feels claustrophobic.
    - **Sidebar items**: 10-12px vertical padding per item (reference the Claude sidebar — items have real space).
    - **Page padding**: 24px on mobile, 40-56px on desktop.
15. Fix the highest-density screens: Dashboard table, Submissions list, Admin orgs list. Compare side-by-side with the Claude usage page screenshot Brian shared. The Claude usage page has serious whitespace; ours should match the calm.
16. Reduce nesting. Brian flagged this in his Beam design notes: "I don't like all the unnecessary nesting." The Forge audit:
    - List rows should not be cards-inside-cards. A list of submissions is rows on a page background, separated by hairline dividers — not nested rectangles.
    - Settings panels should not be cards-inside-cards. A settings section is a heading + dividers + form rows.
    - The Page Detail's tabs should be a clean tab bar + content area, NOT a card containing a tab bar containing card-laid-out content.
17. Borders and dividers: prefer hairline `--border-subtle` over chunky shadows. A list separated by 1px dividers reads cleaner than the same list as nested cards.

### Phase 5 — Sidebar & Navigation Pass

18. Sidebar (the app shell from F-03) gets a focused refresh. The reference is Claude's customizable sidebar — collapsible, sectioned, breathing room, items not crammed.
    - Collapsed and expanded states. Animation 200ms ease.
    - Sections divided by a thin label + a 1px `--border-subtle` rule.
    - Active item: subtle background tint (`--accent-tint`), no garish bar or pill.
    - Hover: slightly darker background.
    - Icon style: line icons at consistent stroke (1.5px) at 20px size. No mixing filled and outline icons.
    - Truncation: long names truncate with ellipsis; tooltip shows the full name.
19. Top bar: minimal. Search (with `⌘K` shortcut indicator), workspace switcher, notification bell, avatar menu. No additional buttons or chrome.
20. Breadcrumbs: where present, use simple `Section / Page / Detail` with caret separators in `--fg-muted`. Active level is `--fg-strong`.

### Phase 6 — The Usage Bar UX (The Centerpiece Detail)

21. The user's reference for the usage bar is the Claude usage page (the screenshot they shared). Fundamental properties to match:
    - A simple **horizontal percentage bar**: full-width track, filled portion in accent color, percent label on the right.
    - A **label and reset time** on the left: "Current session" / "Resets in 1 hr 19 min".
    - Multiple bars stacked vertically, one per metric. Generous vertical spacing between bars.
    - "Last updated: just now" timestamp with a small refresh icon.
    - When a bar is at 100%, the fill color shifts to a calm warning (warm amber, not red — this isn't an error, just a limit).
    - At 95%+, a small "Approaching limit" tag appears next to the percent.
22. Apply this pattern in three places in Forge:
    - **Settings → Usage** — primary location for plan-usage tracking. Shows the user their current session credit usage, weekly cap, daily routines (parallel to Claude's "Daily included routine runs"), monthly spend, and AI-cost meter.
    - **Studio chat panel** — a small inline strip at the bottom shows "Session: 47% used · Resets in 2h 14m". Persistent but unobtrusive. Click expands to a popover with full details.
    - **Admin → Pulse** — the founder-facing version with platform-aggregate usage.
23. Build a single `UsageBar` component used in all three places. Props: `label`, `description?`, `percent`, `valueText?`, `resetText?`, `state` (`normal | warning | exceeded`), `learnMoreHref?`, `infoTooltip?`. Used everywhere usage is displayed; consistency comes for free.
24. Animation: when the percent changes (e.g., after a generation), the fill animates from old to new value over 600ms with a subtle ease-out. No bouncing. Calm.
25. Accessibility: each bar has `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, plus a screen-reader text "X percent of Y used. Resets at Z."

### Phase 7 — Motion Pass

26. Restrain motion. Most surfaces should NOT animate. Strong principles:
    - **Permitted animation surfaces**: page transitions (subtle fade, 180ms), modal entry (scale-from-98 + fade, 220ms), drawer entry (slide, 220ms), sidebar collapse (200ms), the usage-bar fill animation, success toasts (slide-in, 240ms), the conversational form mode card transitions (280ms), Studio's preview-section update (cross-fade, 320ms).
    - **Banned animations**: bouncy springs anywhere, attention-grabbing pulses, decorative hovering elements, parallax on scroll, anything that animates without a state change to communicate.
27. Standard easing: `cubic-bezier(0.4, 0, 0.2, 1)` (Material's "standard"). One easing function for almost everything. Spring only on success-celebration moments (proposal accepted, first publish), and even then restrained.
28. `prefers-reduced-motion`: disable EVERY non-essential animation. State changes still happen instantly; the user doesn't get penalized for setting this preference.
29. Audit Framer Motion usage. Find any animations that snuck in via experimentation; remove or simplify.
30. Loading states: the global loading pattern is a subtle skeleton (low-contrast solid block matching the would-be content's shape) rather than a spinner. Spinners only on action confirmations ("Saving...") for under 2 seconds.

### Phase 8 — Empty States

31. Walk every empty state in the app. Each gets the same treatment:
    - A subtle line-art illustration (~120px wide, single color from `--fg-muted`). Drawn or hand-picked from a consistent illustration set. NOT auto-generated. NOT colorful. NOT cute.
    - A one-line headline that says what's missing in plain language ("No submissions yet", "No pages yet", "No active integrations").
    - A one-line description that says what to do ("Share your page to start receiving submissions").
    - A primary action button when applicable.
    - Layout is centered, uncrowded, calm.
32. Bad empty states to fix:
    - The "No submissions" state currently shows a stock spinner-becomes-empty layout. Redesign.
    - The Templates gallery's filtered-to-zero state currently disappears entirely. Add a "No templates match — try clearing filters" message.
    - The Analytics tab on a fresh page is awkward; needs a "Get your first visitor and watch this fill" treatment.

### Phase 9 — Toast & Notification Polish

33. Toast design:
    - 14-15px Manrope, regular weight.
    - One icon (16px), one short message, one optional action button, one dismiss X.
    - Width: not full-screen on desktop; ~360-420px max.
    - Position: bottom-right (default) or top-center for global system notices (e.g., "Forge is back online after maintenance").
    - Background: `--bg-overlay` with a subtle border. NOT colored full-bleed. Color is implied by a small icon and text shade only.
    - Auto-dismiss: 4 seconds for info, 6 seconds for success, 8 seconds for warning, indefinite for danger (user must dismiss).
    - Stack: multiple toasts stack with 8px gaps.
34. Replace any in-app banners that compete with the page header. A "your trial ends in 3 days" banner currently lives at the top of the dashboard — move it to a calm pulse in the avatar menu (a small dot on the avatar, with a panel on click).

### Phase 10 — Dialog & Drawer Polish

35. Dialogs:
    - Backdrop: `rgba(0, 0, 0, 0.32)` light mode, `rgba(0, 0, 0, 0.6)` dark mode.
    - Dialog: rounded `--radius-lg`, `--bg-overlay` background, no border.
    - Header: 18px Manrope 600 title, optional 13px caption underneath.
    - Body: comfortable padding (28px), short, focused content. If a dialog has more than ~6 form fields, it should be a drawer or a full page.
    - Footer: actions right-aligned. Primary on the right, secondary to its left. Destructive text-styled, leftmost.
    - Escape closes; backdrop click closes (configurable per dialog); focus is trapped inside; first focusable element receives focus on open.
36. Drawers:
    - Slide from the right on desktop, from the bottom on mobile.
    - Width: 480px on desktop, full-screen on mobile.
    - Same header/body/footer convention as dialogs.
    - Used for: Settings tab editors that need more room than a dialog, the Submission detail expand, the Share dialog when it has tabs.

### Phase 11 — Form Polish (Across The App)

37. Forge has many forms (settings, signup, page settings, brand kit). Standardize:
    - Field label above input, 13px `--fg-default`, 8px gap to input.
    - Optional helper text below: 12px `--fg-muted`.
    - Inline validation: `--fg-danger` text below input when invalid; never red borders by default (red borders shouldn't appear unless the user submits with invalid data).
    - Required indicator: a small accent dot after the label, NOT an asterisk (calmer).
    - Save flow: auto-save by default with "Saved" indicator that appears briefly; explicit "Save" button only on transactional flows like billing changes.
38. Inputs:
    - Border: `--border-subtle`. On focus: `--accent-primary` ring with 2px outline offset.
    - Background: `--bg-base` (in card-context) or `--bg-raised` (in page-context).
    - Padding: 10-12px vertical, 14px horizontal.
    - Height: consistent 40px for all single-line inputs across the app.
39. Select / dropdown: matched to input style; chevron icon at right; menu opens with the same animation as drawers but downward.

### Phase 12 — Public Page (User-Facing Output) Polish

40. The public Forge pages your users publish are the SECOND thing prospective users see (after the marketing site) — they need to look as good as the Forge app itself.
41. Audit each workflow's published-page rendering:
    - **Contact form**: hero proportions, form spacing, slot picker visual hierarchy.
    - **Proposal**: cover layout, scope section breathing, line items table density, acceptance block clarity.
    - **Pitch deck**: slide-to-slide consistency, presenter mode chrome.
    - **Landing page**: hero / sections / CTAs all match the design tokens.
42. The "Made with Forge" badge (Free plan): subtle, bottom-right, 11px Manrope 500, accent-tinted. Never garish. Pro+ removes; this is a real upgrade incentive.
43. Public-page metadata: og:image generation needs a clean Forge-branded fallback when the user hasn't uploaded one. Currently a default png; replace with a procedurally-generated one that uses the page title in Cormorant on a brand-tinted background — works for any page automatically.

### Phase 13 — Marketing Site Polish

44. Marketing pages (landing, pricing, templates, workflows/*, compare/*, etc.) get the same treatment:
    - Hero: more whitespace; type breathes; one CTA primary, one secondary tertiary; no glow effects, no gradient backgrounds.
    - Pricing cards (the new Free/Pro/Max tiers from V2-P04): same `UsageBar` aesthetic for "what's included" lists. Plain ✓ / lacking-ones with `--fg-muted`. NOT a feature comparison table with red ✗ marks (signals scarcity, not abundance).
    - Templates gallery: each template is a clean card with a real preview, a single line of description, a "Use this template" tertiary action. NOT a hover-reveal card with overlay text; that's a competitor pattern Forge doesn't need.
    - Footer: minimal. Logo, copyright, three columns of links, social icons. No newsletter signup in the footer (newsletter signup belongs on a dedicated /newsletter page, not as a footer afterthought).
45. Compare pages from V2-P08: each has a calm side-by-side where Forge and the competitor are described in identical formats — no visual asymmetry that makes Forge look better than it is.

### Phase 14 — Microcopy Pass

46. Brian's reference: "professional and fun at the same time, very clear, easy UI to understand." That's tone. Walk every string in the app and ask: would Lucy at Reds Construction read this and feel addressed? Would a founder reading the pricing page feel respected, not pitched-to?
47. Specific microcopy patterns:
    - **Button labels are verbs**: "Publish page", "Send invite", "Save changes". Never "Submit", "OK", "Confirm" alone.
    - **Empty states avoid scolding**: "No submissions yet" not "You haven't received any submissions."
    - **Errors are concrete and actionable**: "We couldn't reach Stripe — your subscription change wasn't saved. Try again in a moment, or [contact support]." Not "An error occurred."
    - **Plural-aware**: "1 submission" / "2 submissions" handled with proper pluralization, never "(s)".
    - **Time labels relative**: "Just now", "5 minutes ago", "Yesterday at 3:14pm", "Last Tuesday". Drop to absolute date only past 7 days.
    - **No exclamation points** unless context demands celebration ("Welcome back!" on a successful sign-in is OK; "An error occurred!" is never OK).
    - **No emoji in product chrome**. Allowed in user content (their page titles, their submission replies). Forge's own UI strings stay clean.
48. Pass through onboarding copy specifically. The first three minutes of a user's life matter; every word earns its place.

### Phase 15 — Dark Mode Pass

49. Dark mode is a first-class theme, not an afterthought. Every surface, component, and illustration must have a dark-mode equivalent.
50. The reference: Claude's dark mode is **warm dark, not cold black**. Background `oklch(0.18 0.01 70)` or similar — a deep warm neutral, not pure black or charcoal. Foreground type sits on a warm dark with full readability.
51. Audit every screen in dark mode. Common bugs:
    - White-on-white shadows that disappear → use a warm-dark border token instead.
    - Charts that retain light-mode colors → swap to dark-mode chart palette.
    - Public Forge pages defaulting to light when the user opted into dark.
    - Imported brand kits with primary colors that have low contrast on the dark background → automatic darkening or the user's chosen accent gets a "for dark mode" auto-derived variant.
52. Toggle: a single Light / Dark / System preference in Settings → Profile. Persistence in `users.user_preferences`. SSR respects.

### Phase 16 — Accessibility Regression Pass

53. After all of the above changes, re-run the accessibility suite from GL-03. Common breakages from polish:
    - Color-contrast regressions when the palette tightens.
    - Focus indicator removal (someone removed an outline because they thought it looked ugly).
    - Heading hierarchy changes (someone restructured a page and skipped a level).
    - Reduced-motion compliance when new animations got added.
54. Fix any regression immediately. Accessibility is not optional polish.

### Phase 17 — Visual Regression Snapshots

55. Take fresh screenshots of every page at the production resolution (light + dark, desktop + mobile). Commit to `apps/web/design/regression/`. Compare against the prior baseline snapshots — any change must be intentional.
56. Build a `/internal/design/showcase` route accessible to admins that renders every component in every state (default, hover, focused, disabled, loading, error, empty). Used for design review.

### Phase 18 — The Two-Day Walk

57. After all individual fixes are merged, dedicate two days to a full product walkthrough. Use a fresh test account with no prior context.
58. Day 1 — main app: signup, onboarding, every workflow, every settings tab, every dashboard, every page detail, every analytics view. Note every cosmetic issue, no matter how small. Don't fix during the walk; collect the list.
59. Day 2 — admin + edge cases: admin overview, all admin tabs, impersonation flow, every error state (trigger a 500, trigger a quota-exceeded, trigger a session-expired), every modal, every dialog, every empty state, every loading state.
60. Then fix the collected list, prioritizing the most-visible issues first. Commit small, descriptive fixes.

### Phase 19 — Final Sign-Off

61. Side-by-side with the original screenshots Brian shared (the Claude usage page, the Beam design notes). Does Forge feel as **calm, professional, and clear** as Claude looks? Does it answer Brian's "I don't like all the unnecessary nesting" feedback?
62. If yes — write the mission report. Include before/after pairs of the most visible improvements.
63. If no — list what's left, schedule a follow-up cycle, document the gap honestly. Polish is an ongoing discipline; declaring this mission "done" doesn't mean polish stops.

---

## Acceptance Criteria

- Design tokens audit complete; no orphaned tokens; no hardcoded colors outside tokens.
- Typography limited to five primary scale steps; Cormorant restricted to display contexts only.
- Color palette tightened: one accent, one tint, four foreground tiers, three background tiers, four status colors, one chart palette.
- Spacing follows a consistent 4-pt scale across every component.
- Nesting reduced — no card-in-card patterns in lists, settings, or page details.
- `UsageBar` component live in Settings, Studio, and Admin Pulse with consistent behavior.
- Motion restrained to documented surfaces with documented timings; reduced-motion respected.
- Empty states across the app have illustration + headline + description + action.
- Toast, dialog, and drawer patterns consistent.
- Forms standardized across every settings surface.
- Public pages match the design language of the app.
- Marketing site polished with Compare pages live.
- Microcopy passes the "would Lucy understand and feel addressed?" test.
- Dark mode is first-class on every surface.
- Accessibility regressions fixed; suite green.
- Visual regression snapshots updated; design showcase route live.
- Two-day walkthrough completed; collected issues fixed.
- Side-by-side comparison with Claude reference confirms calm, professional, clear feel.
- Mission report written with before/after evidence.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
