# Forge Motion System (BP-05)

**Principle:** Deliberate, professional — animation explains **where attention moved** or **what changed**, not decoration.

**Implementation CSS variables:** `apps/web/src/styles/motion.css` (tempos/easings) + legacy **`--duration-*` / `--ease-*`** in `tokens.css` aligned to motion vocabulary.

---

## Tempos (`:root`)

| Token | Typical use |
|-------|----------------|
| `--motion-snap` (120ms) | Single-element discrete state toggle |
| `--motion-standard` (220ms) | Default transitions / hover |
| `--motion-deliberate` (320ms) | Pane focus, stage underline travel |
| `--motion-considered` (480ms) | Modal entry choreography, heavy cross-pane operation |

Easings (`--motion-ease-standard`, `-decelerate`, `-accelerate`, `-bounce`).

**Bounce** — **only** BP-03 War Room stage-indicator permitted use; forbidden elsewhere unless design council exception.

---

## Allowlisted animations (canonical)

| Surface | Behaviour |
|---------|-----------|
| Page shell transition | ~180ms opacity, `ease-standard` |
| Modal entry | ~240ms scale 0.97→1 + opacity, ease-decelerate |
| Drawer / sheet | ~220ms translate, ease-decelerate |
| Sidebar collapse | ~200–220ms dimension/opacity, ease-standard |
| Toast | Slide + fade (~240ms) |
| War Room pane focus | ~320ms active-state opacity choreography |
| War Room stage badge | Controlled bounce (**only**) per War Room docs |
| Usage bar fill width | Extended ease-decelerate (600ms max) |
| Canvas connector stroke dash | Stroke offset ~300ms |
| Skeleton pulse | Gentle infinite **only on loading skeletons**, slow period |
| Studio message enter | Slide+fade bounded |

Anything **not enumerated** receives design review — default to **instant** preference.

---

## Banned animations

See [IDENTITY_FOUNDATION.md](./IDENTITY_FOUNDATION.md). Highlights:

- Decorative floating / orbiting motifs on marketing resting chrome (migrate to near-static washes).
- **Confetti bursts** (`canvas-confetti` etc.) inside product workflows — Forge **does not** celebrate with particle spam.
- Marquee infinite horizontal scroll ticker → **prefer static wraps or horizontally scrollable list without animation hijack.**

---

## Reduced motion (`prefers-reduced-motion`)

All non-functional infinite or decorative cycles must **`animation: none` / `transition-duration: 0ms`**.

---

## Enforcement (engineering)

Prefer central tokens over inline ms values. Run `pnpm --filter web run motion-inventory` — lists `framer-motion` import sites for MOTION_SYSTEM cross-check (see `scripts/ci/framer_motion_inventory.mjs`).

