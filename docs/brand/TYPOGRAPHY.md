# GlideDesign Typography

**Implementation:** Next.js fonts in `apps/web/src/app/fonts.ts`, CSS tokens in `apps/web/src/styles/tokens.css`, and semantic classes in `apps/web/src/app/globals.css`.

## Stacks

| Role | Family | Weight | Usage |
|---|---|---:|---|
| Display | General Sans preferred; Geist Sans fallback if unavailable through `next/font` | 700-800 | Marketing hero, chunky template cards, deck covers, major proof moments |
| Heading | Inter | 700 | App headings, route titles, modal titles |
| Subhead | Inter | 600 | Card titles, section headers, nav labels |
| Body | Inter | 500 | App default, marketing body, form labels |
| Caption | Inter | 500 | Supporting UI, metadata, muted captions |
| Mono | JetBrains Mono | 500 | IDs, code, timestamps, technical data |

No serif display type is part of the GlideDesign identity. The product should feel bold, geometric, crisp, and fast.

## Type Scale

| Class | Size | Line height | Usage |
|---|---:|---:|---|
| `text-display-xl` | `clamp(4rem, 9vw, 5.5rem)` | 1.05 | Homepage hero |
| `text-display-lg` | `clamp(3rem, 7vw, 4rem)` | 1.05 | Section heroes |
| `text-display-md` | `clamp(2.5rem, 5vw, 3rem)` | 1.08 | Cards, page headers |
| `text-h1` | `2rem` | 1.15 | App page title |
| `text-h2` | `1.75rem` | 1.2 | App sections |
| `text-h3` | `1.5rem` | 1.25 | Panels |
| `text-h4` | `1.25rem` | 1.3 | Card headings |
| `text-body` | `1rem` | 1.6 | Default body |
| `text-body-sm` | `0.9375rem` | 1.55 | Dense app body |
| `text-caption` | `0.8125rem` | 1.45 | Metadata |
| `text-code` | `0.8125rem` | 1.5 | Technical text |

## Rhythm

- Display headlines use tight but readable line-height: 1.05 to 1.08.
- Body copy uses comfortable line-height: 1.55 to 1.65.
- Copy blocks max at about 70 characters per line.
- App density can be high, but hierarchy must be obvious.

## Audits

When you find inline `font-size`, migrate to type utilities or documented tokens. One-off optical sizing is allowed only for generated art, OG images, or deliberately oversized marketing moments.
