# Design tokens (`apps/web/src/styles/tokens.css`)

All user-visible color, type, space, radius, shadow, motion, and z-index values should come from this file (or from `next/font` CSS variables referenced here). Tailwind maps them via `globals.css` `@theme inline`.

## Color

| Token | Meaning |
|-------|---------|
| `--color-bg` | Default page / app canvas. |
| `--color-bg-elevated` | Slightly darker inset areas, tab strips. |
| `--color-surface` | Cards, inputs, popovers. |
| `--color-text` | Primary reading text. |
| `--color-text-muted` | Secondary labels, metadata. |
| `--color-text-subtle` | Tertiary / placeholders. |
| `--color-border` | Default hairlines. |
| `--color-border-strong` | Emphasis borders. |
| `--color-accent` | Primary CTA, links, focus accent. |
| `--color-accent-hover` | Darker accent for hover (derived use). |
| `--color-accent-light` / `-mid` / `-bold` | Translucent accent mixes for rings and fills. |
| `--color-success` / `--color-warning` / `--color-danger` | Semantic states. |

Legacy aliases `--bg`, `--text`, etc. point at the same semantics for older class names.

## Typography

| Token | Use |
|-------|-----|
| `--font-display` | Set by `next/font` on `<html>` — display family. |
| `--font-body` | Body family. |
| `--text-xs` … `--text-5xl` | Type scale (~1.25 ratio). |
| `--leading-*` | Tight through relaxed. |
| `--tracking-*` | Display tight / UI normal / caps wide. |
| `--font-weight-*` | 400–700. |

## Spacing

`--space-1` (4px) through `--space-16` (64px) on a 4px grid.

## Radius

`--radius-sm` … `--radius-xl`, `--radius-full`.

## Shadow

`--shadow-sm` … `--shadow-2xl` — warm-neutral ink (OKLCH mix), not pure gray-black.

## Motion

| Token | Value role |
|-------|----------------|
| `--duration-instant` … `--duration-slower` | Interaction duration ladder. |
| `--ease-out` / `--ease-in-out` / `--ease-spring` | Curves for CSS transitions. |

Framer presets live in `src/lib/motion.ts` (`SPRINGS`, `MOTION_TRANSITIONS`).

## Z-index

`--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`, `--z-max`.
