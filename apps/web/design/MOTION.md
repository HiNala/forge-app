# Motion spec — Forge frontend

Central reference for Framer Motion variants (`src/lib/motion.ts`) and CSS keyframes (`globals.css`). Prefer these over one-off timings.

| Surface / interaction    | Mechanism            | Duration | Easing                      | Notes                                |
| ------------------------- | -------------------- | -------- | --------------------------- | ------------------------------------ |
| Page section enter        | `fadeUp`             | ~200ms   | `--ease-out`                | Stagger lists with `listStagger`     |
| Modal / dialog content    | Dialog CSS + opacity | 220ms    | `--ease-out`                | Scale from 0.97 on close state       |
| Toast enter / exit        | Sonner + `toast-in`  | 200ms    | `--ease-out`                | Bottom-center; hover pauses timer    |
| Tab indicator slide       | Tabs `TabsListSliding` | 220ms  | `--ease-out`                | `left` / `width` on indicator        |
| Sidebar width             | CSS transition       | 220ms    | `--ease-out`                 | Content fades 120ms (`opacity`)      |
| Button press              | `:active` scale      | 80ms     | `--ease-out`                | `scale(0.97)`                        |
| Card hover                | transform + shadow   | 160ms    | `--ease-out`                | `-translate-y-px`, shadow-md → lg    |
| Loading dots (Studio)     | `dot-pulse`          | 1.2s loop| stagger 160ms per dot       | three dots                           |
| Skeleton                  | `shimmer`            | 1.3s     | ease-in-out                 | `bg-size` sweep                      |
| Success check / celebrate | `successSpring`      | 420ms    | `--ease-spring`             | subtle overshoot where appropriate   |
| Section edit crossfade    | TBD in Studio        | 280ms    | `--ease-out`                | opacity 0.4 → 1 on content swap      |

When adding a new screen, pick a row above or add a row here first — do not invent new durations without updating this table.
