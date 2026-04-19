# MISSION FE-01 — Design System & Frontend Foundation

**Goal:** Pull the canonical design from Anthropic's design artifact endpoint, read its README, extract every token it defines (color, typography, spacing, radius, shadow, motion), and translate those tokens into the Forge Next.js frontend. Build the primitive components (Button, Input, Textarea, Card, Dialog, Sheet, Tabs, Toast, DropdownMenu, Avatar, Badge, Icon system, Logo) every subsequent mission consumes. Install and configure the motion library and the iconography set. At the end of this mission, nothing user-facing has changed, but every future component is built on a consistent, beautiful, accessible foundation. No more hand-rolling tokens. No more guessing at spacing.

**Branch:** `mission-fe-01-design-system`
**Prerequisites:** Mission 01 complete — Next.js 16 scaffolded, Tailwind installed, shadcn initialized, the frontend runs at `apps/web` via docker compose.
**Estimated scope:** Small-medium by feature count, but every choice here ripples through the whole frontend. Precision matters more than speed.

---

## The Primary Directive (Verbatim)

> **Fetch this design file, read its README, and implement the relevant aspects of the design.**
> **https://api.anthropic.com/v1/design/h/ZhxfTfNViMkEnjhpg1EkxA**
> **Implement: the designs in this project.**

This is the authoritative design source. Treat it as upstream. If anything in this mission document conflicts with the fetched design, the design wins — then update this document to match.

Two additional design reference artifacts are available locally for context only; they are earlier iterations of the same visual direction:

- `/mnt/user-data/uploads/Forge_Landing_Page_v2.html` — the warm-cream landing page with warm teal accent
- `/mnt/user-data/uploads/Forge_App_v6.html` — the full app prototype with Studio, Dashboard, Settings, Page Detail, Automations, Analytics

Use these to verify interaction patterns (sidebar collapse, Studio split-screen, section-click editing, tab behaviors) that the static design file may not capture. They are reference, not source.

---

## The Mixture of Experts Lens for This Mission

Every decision in this mission passes through these questions:

- **Rams** — *"Less, but better."* Is this design token pulling its weight? Can we delete it without harm?
- **Ive** — *"Remove everything that is not essential."* Is this variant doing work, or decorating?
- **Kare** — *"Would this still work at small sizes or quick glances?"* Does the icon system scale?
- **Norman** — *"Is feedback immediate and clear?"* Does every primitive have hover, focus, active, disabled, loading, and error states?
- **Nielsen** — *"Is terminology consistent?"* Is `primary` used the same way everywhere?

When you catch yourself adding "just one more variant," go back to Rams.

---

## How To Run This Mission

Read the design README first. Read the primary directive above three times. Then make the TODO list. Make fewer files, not more. Every primitive lives in exactly one place. Every token lives in exactly one file. If you find yourself defining a color in two places, delete one.

Commit at each phase boundary with descriptive messages: `feat(design): ingest design tokens from upstream`, `feat(ui): Button primitive with 6 states`, `feat(motion): reusable spring presets`.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Fetch & Read the Design

1. Fetch the design artifact at the URL in the directive. Cache the response in `docs/design/raw/` with the date-stamped filename so future missions can reference the snapshot.
2. Read the design's README in full. Extract the sections that describe: palette, typography scale, spacing system, border-radius scale, shadow scale, motion (duration and easing), breakpoints, focus-ring style, and any named component references.
3. Inspect the design file for any Figma-style component definitions (buttons, inputs, tabs, cards) with their variant states. Capture each as a screenshot or SVG export in `docs/design/components/` for reference.
4. Write `docs/design/DESIGN_BRIEF.md` — a plain-English summary of the design in your own words: the mood, the dominant color, the typographic feel, the motion character, any interaction patterns called out. Downstream missions read this as the quick reference.

### Phase 2 — Token Layer

5. Create `apps/web/src/styles/tokens.css` as the single source of truth for design tokens. Use CSS custom properties on `:root` with a `.dark` override block for dark mode. Organize into sections: `/* Color */`, `/* Typography */`, `/* Spacing */`, `/* Radius */`, `/* Shadow */`, `/* Motion */`, `/* Z-Index */`.
6. Colors must use OKLCH, not hex, for every token. This gives us perceptually-even lightness across hues and better accessibility math. Example pattern:
    ```css
    :root {
      --color-bg: oklch(98% 0.005 80);
      --color-surface: oklch(100% 0 0);
      --color-text: oklch(20% 0.01 80);
      --color-text-muted: oklch(45% 0.01 80);
      --color-border: oklch(90% 0.005 80);
      --color-accent: oklch(50% 0.15 192);       /* from design */
      --color-accent-hover: oklch(45% 0.15 192);
      --color-success: oklch(65% 0.15 145);
      --color-warning: oklch(75% 0.15 75);
      --color-danger: oklch(55% 0.2 25);
    }
    ```
7. Typography tokens: font families (`--font-display`, `--font-body`), size scale (`--text-xs` through `--text-5xl` using a 1.25 modular ratio), line-heights, letter-spacings, and font-weights.
8. Spacing scale on a 4px baseline: `--space-1: 0.25rem` through `--space-16: 4rem`. Prefer the Tailwind scale over custom — consistency beats cleverness.
9. Radius scale: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`.
10. Shadow scale: `--shadow-sm` through `--shadow-2xl`, warm-tinted shadows (`rgba(0,0,0,0.06)` with subtle color temperature per the design).
11. Motion tokens:
    ```css
    --duration-instant: 100ms;
    --duration-fast: 180ms;
    --duration-base: 240ms;
    --duration-slow: 400ms;
    --duration-slower: 600ms;
    --ease-linear: linear;
    --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    ```
12. Wire `tokens.css` into `apps/web/src/app/globals.css` via `@import`. Update `tailwind.config.ts` to read these tokens via `var()` so Tailwind utilities (`bg-accent`, `text-muted`, `rounded-lg`) reference the CSS variables, not duplicate values.
13. Add dark-mode token overrides in a `.dark` block. Dark mode is limited by default (no toggle in the authenticated app except in Studio's active split-screen, per the design direction), but the token machinery must support it for future use.

### Phase 3 — Typography & Fonts

14. Load the fonts called out in the design (likely a serif display like Cormorant/Instrument, a body sans like Manrope/Inter/Geist) via `next/font/google` in `apps/web/src/app/layout.tsx` with `display: 'swap'` and `variable: '--font-display' | '--font-body'` so the CSS tokens reference them.
15. Subset to only the weights and ranges the design uses. No "just in case" imports. Every extra font weight is bytes for every visitor.
16. Add a `.prose` override utility for long-form text (pricing comparisons, FAQ answers) that uses `--font-body` with a relaxed line-height and max-width of 65ch.
17. Verify fonts load with FOIT prevention — use `next/font`'s built-in fallback chain.

### Phase 4 — Iconography

18. Standardize on Lucide React as the icon system. Install `lucide-react` if not already present.
19. Create `apps/web/src/components/icons/index.ts` that re-exports the icons the app uses. This gives us a single import surface AND lets the tree-shaker eliminate unused icons.
20. For the Forge logo mark specifically (the "two overlapping rectangles with three horizontal lines" page icon from the v6 prototype), create `components/icons/logo.tsx` as a standalone SVG React component with size and color props. Support three sizes via a `size` prop: `sm` (18px for sidebar), `md` (28px for header), `lg` (52px for hero).
21. Icon default: 16px stroke width 1.75, currentColor. No filled icons unless the design says so. Consistency is the point.

### Phase 5 — Motion Primitives

22. Install `framer-motion` if not already installed. Version-pin to the exact release the docs mission researched.
23. Create `apps/web/src/lib/motion.ts` as the motion presets library. Every animation in the app uses one of these — never ad-hoc inline transitions.
    ```ts
    export const SPRINGS = {
      snappy:  { type: 'spring', stiffness: 500, damping: 30 },
      soft:    { type: 'spring', stiffness: 200, damping: 25 },
      bouncy:  { type: 'spring', stiffness: 400, damping: 15 },
    } as const;
    
    export const TRANSITIONS = {
      fadeIn:      { opacity: [0, 1], transition: { duration: 0.18 } },
      fadeUp:      { opacity: [0, 1], y: [8, 0], transition: { duration: 0.24 } },
      scaleIn:     { opacity: [0, 1], scale: [0.98, 1], transition: { duration: 0.18 } },
      crossfade:   { opacity: [0, 1], transition: { duration: 0.3 } },
    } as const;
    ```
24. Respect `prefers-reduced-motion`: wrap a `useReducedMotion()` check around the motion library's use so animations shorten to `duration: 0.01` for users who opt out.
25. Document the motion vocabulary in `docs/design/MOTION.md`: when to use a spring vs a tween, which spring preset for which element (buttons = snappy, modals = soft, celebratory moments = bouncy).

### Phase 6 — Primitive Components

Each primitive below lives in `apps/web/src/components/ui/{name}.tsx`, has a matching `.stories.tsx` or example file, is fully typed, accepts a `className` for composition, and forwards refs correctly.

26. **Button** — variants: `primary | secondary | ghost | danger | link`. Sizes: `sm | md | lg`. States: default, hover, active, disabled, loading (shows a spinner, preserves layout width), focus-visible. Press animation: `scale: 0.97` on active via Framer Motion with the `snappy` spring. Keyboard: activated by Enter and Space.
27. **Input** — text, email, password. Focus ring uses `--color-accent` with 3px glow. Error state shows a red border + message slot below via `aria-describedby`. Disabled state visually distinct but still readable.
28. **Textarea** — autoresize version using `react-textarea-autosize` (or a custom hook). Min/max rows controllable. Same focus and error states as Input.
29. **Card** — `surface`, `elevated`, `outlined` variants. Optional hover lift (`translateY(-2px)` + shadow deepen) via a `hoverable` prop. Used everywhere.
30. **Dialog / Modal** — portal-rendered, focus-trapped, Escape closes, scroll lock on body. Opens with `scaleIn` motion, backdrop fades. Uses shadcn's Dialog as the foundation, re-themed.
31. **Sheet** — slide-in panel from right (settings drawer, team invite, etc.). Same focus-trap and Escape handling.
32. **Tabs** — horizontal strip with a sliding indicator animated via Framer Motion's `layoutId`. This is the pattern used in Settings and Page Detail.
33. **Toast** — context-based. API: `toast.success(...)`, `toast.error(...)`, `toast.info(...)`. Auto-dismiss in 4s. Animates in with `fadeUp`, stacks from bottom-right (mobile: bottom-center).
34. **DropdownMenu** — keyboard-navigable, click-outside closes. Used in avatar menu, row actions, filter chips.
35. **Avatar** — image with fallback to initials in a colored background (hash the user's name for stable color selection from a curated palette).
36. **Badge** — small inline status tag. Variants for page status (draft / live / archived) with appropriate colors.
37. **Separator** — horizontal and vertical. Token-driven.
38. **Tooltip** — shows after 400ms hover delay. Used on collapsed sidebar icons, analytics metric labels, any icon-only button.
39. **Skeleton** — pulsing placeholder for loading states. Matches the shape of what's loading (not a generic spinner).
40. **EmptyState** — reusable component with an icon slot, title, description, and CTA slot. Used everywhere a list could be empty.

### Phase 7 — Layout Primitives

41. **Stack** and **Row** — simple flex wrappers with a `gap` prop mapped to spacing tokens. Avoids a thousand `className="flex gap-4"` repetitions.
42. **Container** — centered max-width wrapper used across marketing pages. Max-widths: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
43. **Grid** — basic grid wrapper with a `cols` prop for the common cases (2, 3, 4, auto-fit).

### Phase 8 — Global Styles & Meta

44. Update `apps/web/src/app/globals.css` to import `tokens.css`, apply base styles (body background, text color, font-body as default, antialiased), and set up the focus-visible outline token-wide.
45. Remove any default Next.js boilerplate styles that conflict (e.g., the gradient hero background from `create-next-app`).
46. Scrollbar styling: custom thin scrollbars on `overflow` elements using `scrollbar-width: thin` and `::-webkit-scrollbar` variants. Warm palette to match.
47. Selection color: `::selection { background: var(--color-accent); color: white; }`.
48. Set `color-scheme: light dark` on `:root` so native form controls pick up the right palette.

### Phase 9 — Documentation

49. Write `docs/design/COMPONENTS.md` — a short reference listing every primitive with its props, states, and a usage example. Every downstream mission reads this before building a new UI surface.
50. Write `docs/design/TOKENS.md` — the full token table with semantic meaning for each one. E.g., `--color-text` is "default reading text," `--color-text-muted` is "secondary metadata, de-emphasized."
51. Add a `/dev/design-system` route (gated on dev env only; returns 404 in prod) that renders every primitive in every state. Self-documenting, useful for visual regression checks.

### Phase 10 — Verification

52. Run axe-core against `/dev/design-system`. Zero violations. Every primitive passes WCAG AA color contrast.
53. Keyboard-navigate through every primitive. Focus is visible on every interactive element. Tab order is logical.
54. Lighthouse on a blank page with the full token + font load: ≥ 95 on performance. CLS = 0.
55. Bundle size: the token + primitive layer adds < 30KB gzipped to every route.
56. Mission report written in `docs/missions/MISSION-FE-01-REPORT.md`.

---

## Acceptance Criteria

- Design artifact is fetched, cached, and summarized in `docs/design/DESIGN_BRIEF.md`.
- Every design token lives in exactly one place (`apps/web/src/styles/tokens.css`) and every component reads from it.
- All 15+ primitive components listed in Phase 6 are built, keyboard-accessible, and visually match the design.
- Motion library is in place with defined presets; no ad-hoc transitions anywhere.
- `/dev/design-system` page renders every primitive in every state.
- Zero axe-core violations on the design system page.
- Lighthouse ≥ 95 on a primitive-heavy page.
- Mission report written.

---

## Repo tracking (living)

Current depth vs this brief: **[FRONTEND_STATUS.md](./FRONTEND_STATUS.md)** · Index & mission reports: **[00_README.md](./00_README.md)**

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
