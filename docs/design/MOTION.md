# Motion vocabulary (Forge)

All product motion goes through **`@/lib/motion`** — `SPRINGS`, `MOTION_TRANSITIONS`, and **Variants** (`fadeIn`, `fadeUp`, `scaleIn`, …). Avoid ad-hoc `transition` inline except in isolated experiments.

## Springs (`SPRINGS`)

| Preset   | Use case |
| -------- | -------- |
| **snappy** | Buttons, toggles, small UI feedback (press `whileTap`). |
| **soft**   | Modals, sheets, sliding tab indicators, large panels. |
| **bouncy** | Celebratory / success moments (sparingly). |

## Tweens (`MOTION_TRANSITIONS`)

Short opacity/position tweens for list items, cross-fades, and lightweight enter/exit. Prefer **`MOTION_TRANSITIONS.fadeIn`** (180ms-class) for route-level fades.

## Variants

Use **Variants** for `motion` components with `initial` / `animate` / `whileInView`. Parent **listStagger** + child **listItem** for stacked reveals.

## Reduced motion

Use **`useReducedMotion()`** from `@/hooks/use-reduced-motion` before long path animations. **`reduceTransition()`** in `@/lib/motion` can collapse arbitrary transitions to ~0.01s when you compose low-level Framer APIs.

Browser **`prefers-reduced-motion: reduce`** should be respected everywhere we animate (buttons still function; scale can be skipped).

## When to use what

- **Spring** — Physical, “held” UI (sheet, tab pill, button press).
- **Tween** — Opacity, simple Y shift, crossfade.
- **CSS** — Hover color, borders, token-driven durations in `globals.css` keyframes (`dot-pulse`, `shimmer`) for non-interactive decoration.
