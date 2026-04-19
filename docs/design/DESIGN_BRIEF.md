# Forge — design brief

**Upstream:** The Anthropic design artifact at `api.anthropic.com/v1/design/h/...` was not retrievable without credentials (see `docs/design/raw/`). This brief matches the **mission directive** and the **implemented token file** (`apps/web/src/styles/tokens.css`).

## Mood

Calm, editorial product UI: **warm off-white backgrounds** (slight yellow-green chroma in OKLCH), **confident serif display** for marketing and page titles, **humanist sans** for body and controls. Forge should feel like a studio desk—paper, ink, and a single accent—not a neon dashboard.

## Dominant color

**Warm teal accent** (~OKLCH hue 192): used for primary actions, focus rings, selection highlight, and the logo glyph. Neutrals stay in the same hue family so borders and text feel cohesive.

## Typography

- **Display:** Cormorant Garamond (weights loaded: 400, 600, 700) — headlines, nav wordmark adjacency, marketing hero.
- **Body:** Manrope (300–600) — UI chrome, forms, tables, Studio chat.

## Motion

Short, confident transitions: **fast** for buttons and hovers (~180ms), **base** for panels (~240ms), **slow** for large surfaces. Springs: **snappy** for press, **soft** for sliding tab indicator and modals, **bouncy** for rare celebration. Respect **`prefers-reduced-motion`** (animations collapse to near-instant).

## Interaction patterns

- **Tabs:** Sliding pill behind the active trigger (Framer Motion + spring), keyboard focus on triggers.
- **Modals / sheets:** Focus trap, Escape, backdrop; enter with scale + fade.
- **Toasts:** Stack from bottom-right (desktop); sonner-driven.
- **Sidebar:** Collapse preserves icon rail + delayed tooltip (400ms).

## Dark mode

**Class-based `.dark`** on subtrees (e.g. Studio preview), not global `prefers-color-scheme`. Token overrides live in `tokens.css` under `.dark`.
