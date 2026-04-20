# Review finding style (O-04)

Findings must be **actionable**, **specific**, and **attributed** to the expert whose lens surfaced them.

## Good

- “Hero headline is 14 words — shorten to 6–8 so the primary CTA wins scan attention.” (Rams / word economy)
- “Form exposes nine fields above the fold; collapse optional fields under ‘Add details’.” (Kare / glanceable)

## Bad

- “The hero could be stronger.” (not actionable)
- “Consider improving UX.” (no owner, no expert dimension)

## Auto-fixable

Mark `auto_fixable=true` only when the refiner can apply a **structural** or **local copy trim** without changing the user’s product positioning or voice. Tone or brand personality shifts are usually `auto_fixable=false` and surface as suggestion chips.

## Severity

- **critical** — page fails its job (missing submit, broken proposal math).
- **major** — works but significant flaw.
- **minor** / **suggestion** — polish and alternatives.
