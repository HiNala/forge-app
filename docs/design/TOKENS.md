# Design tokens (Forge)

**Source file:** `apps/web/src/styles/tokens.css` (single source of truth). Tailwind maps semantic colors via `globals.css` `@theme inline` (e.g. `bg-bg` → `--bg`).

## Colors

| Token | Meaning |
| ----- | ------- |
| `--color-bg` / `--bg` | Page chrome background (warm cream light). |
| `--color-bg-elevated` | Slightly raised surfaces, subtle panels. |
| `--color-surface` / `--surface` | Cards, inputs, menus. |
| `--color-text` | Primary reading text. |
| `--color-text-muted` | Secondary metadata. |
| `--color-text-subtle` | Tertiary / placeholders. |
| `--color-border` | Default hairline borders. |
| `--color-border-strong` | Emphasized dividers. |
| `--color-accent` | Primary action, links, focus family. |
| `--color-accent-light` / `--accent-mid` / `--accent-bold` | Rings, fills, hover washes. |
| `--color-success` / `--warning` / `--danger` | Semantic states. |

All defined in **OKLCH** for even lightness. Dark scope (`.dark`) overrides the same set for Studio / split panels.

## Typography

| Token | Role |
| ----- | ---- |
| `--font-display` | Set on `<html>` via `next/font` — Cormorant Garamond. |
| `--font-body` | Manrope for UI. |
| `--text-xs` … `--text-5xl` | Modular ~1.25 scale. |
| `--leading-*` | tight / snug / normal / relaxed. |

Long-form: utility **`.prose-forge`** (max-width **65ch**, relaxed leading).

## Spacing

`--space-1` … `--space-16` — **4px baseline** (`--space-1` = 0.25rem). Prefer Tailwind `gap-4`, `p-6`, etc., which align to the same scale.

## Radius

`--radius-sm` through `--radius-xl`, plus **`--radius-full`** for pills.

## Shadow

`--shadow-sm` … `--shadow-2xl` — soft, warm-neutral ink (OKLCH mixes). Dark mode deepens contrast.

## Motion

| Token | Typical use |
| ----- | ----------- |
| `--duration-instant` … `--duration-slower` | Micro → emphasized transitions. |
| `--ease-out` / `--ease-in-out` / `--ease-spring` | Default UI easing. |
| `--ease-legacy-out` | Legacy `cubic-bezier(0.4,0,0.2,1)` for compatibility. |

## Z-index

`--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast` — reserve bands for stacking; use Tailwind `z-dropdown` etc. where mapped.

## Breakpoints

Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.
