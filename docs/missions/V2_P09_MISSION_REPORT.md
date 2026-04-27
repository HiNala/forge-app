# V2 Mission P-09 — UI/UX Polish (Claude-Quality Pass) — Status

## Summary

This pass applies a **calm, warm, low-chrome** design language: terracotta accent on cream, generous spacing, restrained motion, and a **single `UsageBar` pattern** for credit and capacity meters. Work lands on branch `mission-v2-p09-ui-polish`.

## Delivered in this implementation

### Design tokens (`apps/web/src/styles/tokens.css`)

- **Backgrounds:** `--color-bg`, `--color-bg-raised`, `--color-bg-overlay` (three layers) plus legacy `surface` / `bg-elevated` aliases.
- **Foregrounds:** four-step stack `--color-fg-strong` through `--color-fg-faint` (mapped to existing `--text*` usage).
- **One accent** + **accent tint**; terracotta primary `oklch(70% 0.14 45)`.
- **Borders:** subtle + strong only; **radius** sm/md/lg + pill (`--radius-xl` aliased to lg to avoid a fifth size).
- **Status:** success, warning, danger, **info**; **usage** track/fill/approach/full (amber at cap, not red).
- **Chart palette** `--chart-1` … `--chart-5` for Recharts and analytics.
- **Motion:** standard ease `cubic-bezier(0.4, 0, 0.2, 1)` as `--ease-standard`; **600ms** usage animation token.

### Global utilities (`apps/web/src/app/globals.css`)

- **Type scale classes:** `.type-display` … `.type-caption` (Manrope; Cormorant only for `.type-display` per discipline).
- **Reduced motion:** `card-lift` hover, ticker, hero orb disabled when `prefers-reduced-motion`.
- **Section label** weight reduced to 600 (was 700).

### `UsageBar` (single component)

- Props: `label`, `description` / `sublabel`, `percent` / `percentUsed`, `used`, `cap`, `resetText`, `valueDetail`, `variant` (`default` | `inverse` for Studio), `learnMoreHref`, `infoTooltip`.
- **95%+** shows “Approaching limit”; **100%** uses warm **usage-fill-full** (not error red).
- **600ms** width transition; respects **prefers-reduced-motion**.
- **role=progressbar** + `aria-valuenow` / `aria-valuetext`.

### Surfaces using `UsageBar`

- **Settings → Usage** — session, weekly, **extra overage** (cents, USD `valueDetail`), typography headings moved to `type-*` scale.
- **Studio** — `StudioSessionUsageStrip` uses `variant="inverse"` + link to full usage.
- **Admin → Pulse** — platform **7d active / users** and **live / total pages** as honest percentage bars, plus supporting KPI cards; refresh + “last updated” pattern.

### Internal design routes (dev or platform admin)

- `/internal/design/tokens` — color swatches, radius, type samples.
- `/internal/design/showcase` — buttons, input, `UsageBar` states + dark strip.

### Sidebar

- **Active item:** tint background, **no** left bar chrome; **200ms** collapse animation with standard ease.
- **Session quota** mini-bar: uses **usage** fill tokens (no hardcoded red/orange).

### Templates

- **Filtered empty state:** line-art SVG, headline, “Clear filters” + “Start from Studio”; removed **hover-reveal overlay** on cards.

## Incremental polish (post–initial report)

- **Tokens:** `--bg-base`, `--bg-raised`, `--bg-overlay`, `--fg-*` semantic aliases (same values as `--color-*`) for documentation and audits.
- **Toasts:** `max-w` ~420px, `gap={8}`, neutral `border-border`, **240ms** `animate-toast-in` with **standard ease**; **reduced-motion** disables toast + skeleton pulse.
- **useToast:** success **6s**, info **4s**, **warning 8s**, error until dismissed.
- **Settings → Usage:** header **Last updated** + refresh; **consistent `space-y-10`** and **`radius-lg` / p-6** cards; **plan resources** rows use **`UsageBar`** (same pattern as session).
- **Studio strip:** one-line **“Session: N% used · …”** above the bar.
- **Templates:** calmer **filtered-empty** copy.

## Follow-up (not all TODO lines closed in one PR)

- Full **hex grep** pass outside `tokens.css` to eliminate remaining hardcoded colors in marketing and components.
- **Recharts** — wire `--chart-1` … `--chart-5` in every analytics chart.
- **Form standardization** (required dot, 40px inputs) across **all** settings pages.
- **Public OG image** — procedural Cormorant title card (item 43).
- **Two-day walk** (items 57–60) and snapshot commits under `apps/web/design/regression/`.
- **GL-03 a11y suite** re-run after broad token change.

## Verification

- `pnpm run typecheck` — pass
- `pnpm run lint` — pass
- `pnpm run build` — pass (existing Next middleware warning only)

## Branch

`mission-v2-p09-ui-polish` — commit after review.
