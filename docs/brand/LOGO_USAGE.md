# GlideDesign Logo Usage

GlideDesign ships vector marks in `apps/web/public/brand/` and React logo components under `apps/web/src/components/icons/`.

## Concept

The GlideDesign mark is a cursor in motion: a geometric arrow/plane with a trailing dot and a violet-to-coral sweep. It should feel like intent becoming product.

## Variants

Maintain these source-of-truth SVGs:

1. `logo-full.svg` — horizontal lockup.
2. `logo-stacked.svg` — stacked lockup for narrow or centered contexts.
3. `logo-mark.svg` — standalone square mark.
4. `wordmark.svg` — wordmark only.
5. Light-on-dark variants for dark panels and email headers.
6. Monochrome graphite variant for formal documents.

## Clear Space

Use minimum clear space equal to **1x the mark height** on every side. More is preferred in marketing moments.

## Minimum Sizes

| Variant | Minimum |
|---|---:|
| Mark only | 24px |
| Full lockup | 96px wide |
| Stacked lockup | 88px wide |
| Favicon | 16px, optimized separately |

## Banned Modifications

- Do not recolor outside the official violet-coral gradient, graphite, white, or monochrome variants.
- Do not stretch, skew, rotate, outline, or add shadows.
- Do not apply alternative gradients.
- Do not place the full-color mark on saturated backgrounds without a white or ink container.
- Do not recreate the wordmark in arbitrary fonts.

## Product Usage

- Marketing nav: full lockup on desktop, mark on compact screens.
- App sidebar: mark only at 32px.
- Email header: horizontal lockup at 32px height.
- Stripe Checkout and Portal: logo mark or horizontal lockup, with brand violet as the primary color.
- Free-plan public badge: text badge only, not the full logo.

## Raster Exports

Raster exports exist only for fallback contexts: PNG at 1x/2x/3x, favicons, Apple touch icon, Android icons, and legacy email clients. Regenerate every raster when the SVG changes.
