# Icon System — Lucide Only

Forge standardizes on **`lucide-react`** (**outline**, consistent stroke metaphors).

## Rules

| Property | Rule |
|---------|-----|
| Library | lucide-react only (`import { Icon } from 'lucide-react'`) |
| Stroke optical | Matches Lucide defaults (effective **1.5px** visually at nominal scale) |
| Sizes | Chrome **20**, inline **16**, large CTA **24** px boxes |
| Color | Prefer `currentColor` / text token inheritance |

## Legacy imports banned

Historical scans for `@heroicons/react`, `@fortawesome/react-fontawesome`, arbitrary glyph packs — **migrate** to lucide equivalents (map old names in PR checklist).

Latest repo grep (BP-05): **none** matched under `apps/web/src/**/*.tsx`; keep clean.

---

## Forge custom marks (`apps/web/src/components/icons/`)

- `ForgeLogo*` lockups adhere to **[LOGO_USAGE.md](./LOGO_USAGE.md)**.
- Decorative empty-state motifs should emulate Lucide line weight & corner radii metaphors.

