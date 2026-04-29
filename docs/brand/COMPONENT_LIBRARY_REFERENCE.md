# Component Library Visual Reference — Forge

Companion to **`IDENTITY_FOUNDATION.md`** and tokens. Describes **intent + primary token coupling** — not exhaustive prop tables (see Storybook-ish internal pages `/internal/design/*` when present).

---

## Foundations

| Token area | Typical components |
|-----------|---------------------|
| `--color-bg*` | Page scaffolding, trays |
| `--color-surface*` | Panels, dialogs |
| `--color-accent*` | Primary solid buttons |
| `--color-accent-tint*` | Hover wash, subdued chips |
| `--color-data-accent*` | Analytics KPI line, SYSTEM pane pulses |
| `--color-danger*` | Rare destructive affirmation surfaces only |

Motion references map to **`MOTION_SYSTEM.md`** allowlist.

---

## Buttons (`Button`)

| Variant | Fill | Outline | Typography |
|---------|-----|---------|-----------|
| `primary` | `accent` fg white | none | Manrope medium |
| `secondary` | `surface`/`bg-elev` | `border` | toned default |
| `ghost` text | inherit | invisible | subdued hover bg |
| `danger` committed confirm | contextual | review token pairings | — |

Elevation: **shadow elevated only on dialogs** — list rows avoid heavy lift shadows (see globals `.surface-panel` restraint).

---

## Inputs

Focus ring uses **`--accent`** / tinted halo — never electric blue raw system focus.

---

## Toasts (`sonner`)

Entrance choreography per motion doc — tonal contrast border; success/warn/danger **semantic side accent bar** rather than screaming full bleed.

---

### Continuous updates

Raise PR editing this file when naming new composite patterns (“Forge Pane Rail”, etc.) — maintain single vocabulary.
