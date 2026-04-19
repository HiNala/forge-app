# Motion vocabulary (`src/lib/motion.ts`)

Use **`SPRINGS`** and **`MOTION_TRANSITIONS`** (alias: **`TRANSITIONS`**) instead of ad-hoc durations in components.

## Springs

| Preset | Stiffness / damping | Use for |
|--------|---------------------|---------|
| `snappy` | 500 / 30 | Button press, small toggles. |
| `soft` | 200 / 25 | Tab pill, dialogs, sheets. |
| `bouncy` | 400 / 15 | Celebrations, success bursts (sparingly). |

## Transitions (tween)

`MOTION_TRANSITIONS.fadeIn`, `.fadeUp`, `.scaleIn`, `.crossfade` — opacity / position / scale for route and list entrances.

## Variants

`fadeIn`, `fadeUp`, `scaleIn`, `slideInRight`, `listStagger`, `listItem`, `successSpring` — compose with `motion` components.

## Reduced motion

- **CSS:** `@media (prefers-reduced-motion: reduce)` in `globals.css` for keyframes.
- **Framer:** use `useReducedMotion()` from **`framer-motion`** in motion-driven components; use `reduceTransition()` from `@/lib/motion` when passing a `transition` object manually.
- **DOM:** `useReducedMotion()` in `src/hooks/use-reduced-motion.ts` for non-Framer logic.

## When to use spring vs tween

- **Spring:** Physical metaphors—press, slide, overshoot (tabs, modals).  
- **Tween:** Fade-only or crossfade where no overshoot is desired.
