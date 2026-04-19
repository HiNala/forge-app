# `apps/web/design/`

| File / path              | Purpose                                                                 |
| ------------------------- | ------------------------------------------------------------------------ |
| `MOTION.md`               | Motion inventory for primitives and routes.                              |
| `screenshots/`            | Baseline and palette regression shots (see folder README).               |
| `README.md` (from bundle) | Drop the designer’s entry README here after fetch (see below).          |
| `artifact.json`           | **Pending** — raw Anthropic Design API export. Run `FETCH_DESIGN.md`.    |

## Primitives scratchpad

- URL: **`/dev/primitives`** (`src/app/dev/primitives/page.tsx`). Production builds return **404** for this route.

## Tailwind

- **v4** sources tokens from `src/styles/tokens.css` + `src/app/globals.css` (`@theme inline`, `@custom-variant dark` for class-based Studio scope).
- `tailwind.config.ts` at the app root sets `content` + `darkMode: "class"` for Mission F01 parity with classic `theme.extend` workflows; color/spacing tokens remain CSS-first.

## Fetching the designer artifact

The authenticated design endpoint must be run with a valid API key (invalid keys return **401** with `unsupported authentication method for HTTP endpoint`). See `FETCH_DESIGN.md` for the exact `curl` command.

Once `artifact.json` (or a manifest) exists, copy any `README.md` from the bundle into this folder, then update `src/styles/tokens.css` only as needed to match naming in the artifact, and record mappings in this file.

## What F01 derived

Until the artifact is checked in, tokens follow the **locked product palette** from the Forge frontend mission brief:

- Warm cream background, white surfaces, teal `oklch` accent (dev palette switcher: Teal / Sage / Indigo).
- Cormorant Garamond (display) + Manrope (body) via `next/font`.
- Borders at `1.5px`, radii 6–11px band, shadows `sm` / `md` / `lg`.
- Studio-only dark scope via a `.dark` subtree (`@custom-variant`), not global dark mode.
