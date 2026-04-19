# Forge — design brief (quick reference)

This document summarizes the product visual direction for downstream missions. The **authoritative** upstream source is Anthropic’s design artifact at `https://api.anthropic.com/v1/design/h/ZhxfTfNViMkEnjhpg1EkxA` (see `docs/design/raw/` for snapshots). Until that file is ingested with API access, Forge uses the **locked palette** below, aligned with internal HTML prototypes (warm cream shell, teal accent, optional Studio dark subtree).

## Mood

- Calm, editorial, confident — not playful or noisy.
- Light mode is default: warm off-white backgrounds, near-black body text, restrained borders.
- Accent is a **cool teal** (OKLCH) for links, focus, and primary actions; tenant brand kits may shift hue via runtime CSS variables in product surfaces.

## Color

- **Background**: warm cream / paper (high lightness, very low chroma, hue ~80–90).
- **Surface**: white cards on bg; subtle elevation via shadow, not heavy gray fills.
- **Text**: deep warm umber for primary reading; stepped muted tiers for metadata.
- **Accent**: teal (`oklch(~50% 0.15 192)`) with light/mid mixes for rings and subtle fills.
- **Semantic**: success (green), warning (amber), danger (red) — all in OKLCH for perceptual uniformity.

## Typography

- **Display**: serif (Cormorant Garamond) — headlines, product name, major titles.
- **Body**: geometric sans (Manrope) — UI, forms, dense reading.
- Scale follows a **modular ~1.25 ratio** (see `TOKENS.md`); long-form prose targets **~65ch** width.

## Spacing & radius

- **4px baseline** — spacing tokens `1 → 16` map to `0.25rem → 4rem`.
- **Radii**: sm/md/lg/xl/full — cards and controls use md–lg; pills use full.

## Motion

- Short, confident tweens for layout and opacity; springs reserved for celebratory or high-attention moments (success, major panel motion).
- **Respect `prefers-reduced-motion`**: durations collapse to near-instant.

## Shadows

- Soft, warm-neutral: low spread, subtle Y-offset; darker in `.dark` Studio scope.

## Interaction patterns (from HTML prototypes)

- Sidebar collapse with icon-only mode + delayed tooltips.
- Studio: split view, optional dark subtree for editor chrome.
- Settings / page detail: tab strip with a **sliding active indicator**.

## Conflicts

If the fetched Anthropic artifact differs from this brief, **update this file and `tokens.css` to match the artifact**, then record the change in the active mission report.
