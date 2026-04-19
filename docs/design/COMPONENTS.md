# UI primitives reference

Paths: `apps/web/src/components/ui/*.tsx` unless noted. All accept **`className`** for composition unless stated.

## Button

- **Props:** `variant` — `primary | secondary | ghost | danger | link`; `size` — `sm | md | lg`; `loading`, `asChild` (Radix Slot).
- **States:** hover, focus-visible ring, disabled, loading (spinner + width preserved).
- **Motion:** `whileTap` scale uses `SPRINGS.snappy` (`link` skips scale).
- **Example:** `<Button variant="primary">Save</Button>`

## Input

- **Types:** text, email, password, etc.
- **Props:** `error`, `helperText` — helper sets `aria-describedby`.
- **Focus:** 3px accent wash via box-shadow.

## Textarea

- **Props:** `error`, `helperText`, `showCount`, `maxLength`, `autoResize`, `minRows`, `maxRows`.
- **`autoResize`:** uses `react-textarea-autosize`.

## Card

- **Props:** `variant` — `surface | elevated | outlined`; `hoverable` (alias: deprecated `interactive`).
- **Example:** `<Card variant="elevated" hoverable>…</Card>`

## Dialog / Sheet

- Radix-based; focus trap, Escape, scroll lock via primitives. See `dialog.tsx` / `sheet.tsx`.
- Content animations: project uses motion + tokens for overlays where applied.

## Tabs

- **`TabsListSliding`** — animated indicator (`motion.span` + `SPRINGS.soft`).
- **Example:** settings / page detail tab strips.

## Toast

- **Sonner** — `toast.success` / `.error` / default; styled in `toaster.tsx` + `globals.css` keyframes.

## DropdownMenu

- Radix; keyboard nav, click outside. `dropdown-menu.tsx`.

## Avatar

- Image + initials fallback; hue from name hash. `avatar.tsx`.

## Badge

- **Variants:** `live`, `draft`, `archived`, `count`, `booking`, `waitlist`, `contact`, `landing`. `badge.tsx`.

## Separator

- **Props:** `orientation` — `horizontal | vertical`. `separator.tsx`.

## Tooltip

- Default **400ms** delay via `TooltipProvider`. `tooltip.tsx`.

## Skeleton

- Pulsing block; match shape with classes. `skeleton.tsx`.

## EmptyState

- **Path:** `components/chrome/empty-state.tsx` — icon, title, description, primary/secondary actions.

## Layout

- **Stack** — vertical flex + `gap` token index.
- **Row** — horizontal flex + `gap`, `justify`, `align`.
- **Container** — `max` — `sm | md | lg | xl`.
- **Grid** — `cols` — `1 | 2 | 3 | 4 | auto`.

## Icons / Logo

- **Lucide:** prefer `@/components/icons` barrel for shared exports.
- **Logo:** `@/components/icons/logo` — `ForgeLogo` / `ForgeMark`, `size` — `sm | md | lg`.
