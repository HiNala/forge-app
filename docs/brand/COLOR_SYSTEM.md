# GlideDesign Color System

Canonical values live in `apps/web/src/styles/tokens.css`. OKLCH is authoritative because it keeps perceived lightness consistent while the palette moves between white app surfaces, saturated marketing panels, and deep ink dark mode.

## Principles

1. **White interior, fearless marketing.** The app stays calm and readable. Marketing gets the saturated blocks.
2. **Violet to coral is the brand motion.** Primary actions, focus states, active outlines, and AI motion use the violet-coral gradient.
3. **Color has a job.** Marketing colors frame pages and templates. Status colors communicate state. Chart colors stay curated and never rainbow.
4. **Dark mode is power mode.** It should feel closer to x.com: dense, clear, and confident, not decorative.

## Marketing Palette

Use these as full-bleed panels, template cards, OG backgrounds, and large promotional blocks.

| Token | Value | Usage |
|---|---:|---|
| `--marketing-lime` | `oklch(0.94 0.18 125)` | Website/template cards, optimistic launch panels |
| `--marketing-sky` | `oklch(0.85 0.13 230)` | Social/community panels |
| `--marketing-coral` | `oklch(0.78 0.18 25)` | Pricing CTAs, urgency without danger |
| `--marketing-mint` | `oklch(0.84 0.10 165)` | Workflow/system sections |
| `--marketing-lavender` | `oklch(0.85 0.10 295)` | Testimonials and soft proof |
| `--marketing-mustard` | `oklch(0.81 0.15 90)` | Promotional accents and final CTAs |
| `--marketing-magenta` | `oklch(0.62 0.27 330)` | High-energy CTAs and designer agent edges |
| `--marketing-ink` | `oklch(0.13 0.02 280)` | Alternating black sections |

## Brand Primary

| Token | Value | Usage |
|---|---:|---|
| `--brand-violet` | `oklch(0.55 0.21 285)` | Primary brand, active route, focus rings |
| `--brand-coral` | `oklch(0.70 0.20 25)` | Secondary brand, gradient endpoint |
| `--brand-gradient` | `linear-gradient(95deg, var(--brand-violet), var(--brand-coral))` | Primary buttons, logo mark, selected outlines |
| `--brand-gradient-radial` | `radial-gradient(circle at 30% 30%, var(--brand-violet), var(--brand-coral) 70%)` | Hero mesh, OG art, glow effects |

## App Interior Palette

| Role | Token | Light value | Usage |
|---|---|---:|---|
| Base | `--bg-base` | `oklch(1.00 0.00 0)` | Primary app surface |
| Raised | `--bg-raised` | `oklch(0.98 0.005 280)` | Cards and secondary surfaces |
| Overlay | `--bg-overlay` | `oklch(1.00 0.00 0)` | Dialogs, popovers |
| Canvas | `--bg-canvas` | `oklch(0.97 0.005 280)` | Studio chrome and canvas wells |
| Tinted | `--bg-tinted` | `oklch(0.95 0.04 285)` | Active and selected states |
| Strong text | `--fg-strong` | `oklch(0.13 0.02 280)` | Headlines, primary labels |
| Body text | `--fg-default` | `oklch(0.27 0.012 280)` | Main body |
| Muted text | `--fg-muted` | `oklch(0.50 0.008 280)` | Captions and support |
| Faint text | `--fg-faint` | `oklch(0.72 0.005 280)` | Disabled and dividers |
| Border | `--border-subtle` | `oklch(0.92 0.005 280)` | Hairlines |
| Strong border | `--border-strong` | `oklch(0.84 0.008 280)` | Emphasis and inputs |

## Dark Mode

Dark mode mirrors the same roles under `[data-theme=\"dark\"]` and `.dark`. Use deep cool ink for base surfaces, lifted violet/coral for actions, and restrained hairlines for density.

## Contrast Verification

These pairings are the baseline for WCAG AA checks:

| Pairing | Required result |
|---|---|
| `--fg-strong` on `--bg-base` | AA body and AAA large |
| `--fg-default` on `--bg-base` | AA body |
| `--fg-muted` on `--bg-base` | AA for captions where essential; otherwise supporting only |
| White on `--brand-violet` | AA for buttons |
| White on `--brand-gradient` | Check both endpoints; use darker text only on light marketing colors |
| Dark-mode `--fg-default` on dark `--bg-base` | AA body |

If a pairing fails, fix the token. Do not patch individual components with one-off colors.

## Do-Not Rules

| Color | Never use for |
|---|---|
| Marketing colors | Dense app backgrounds or long reading surfaces |
| Brand gradient | Large body text fills |
| Status danger | Non-destructive warnings |
| Faint foreground | Sole indicator of an important action |
