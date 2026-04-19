# UI primitives (`apps/web/src/components/ui/`)

Import from `@/components/ui/*` unless noted. All primitives accept `className` (merged with `cn`) and forward refs where applicable.

## Button

**File:** `button.tsx`  
**Variants:** `primary` | `secondary` | `ghost` | `danger` | `link`  
**Sizes:** `sm` | `md` | `lg`  
**Props:** `loading?`, `asChild?` (Radix Slot; no loading)  
**States:** Hover/active (Framer `whileTap` scale 0.97 with `SPRINGS.snappy`, disabled when `prefers-reduced-motion`), focus-visible ring, disabled opacity, loading shows `Loader2` + `sr-only` text.

```tsx
import { Button } from "@/components/ui/button";

<Button variant="primary" loading>Saving…</Button>
```

## Input

**File:** `input.tsx`  
**Props:** `error?`, `helperText?` — sets `aria-invalid`, `aria-describedby`.  
Focus: 3px accent glow via `box-shadow`.

## Textarea

**File:** `textarea.tsx`  
**Props:** `autoResize?`, `minRows` / `maxRows`, `showCount?` (with `maxLength`).

## Card

**File:** `card.tsx`  
**Variants:** default (surface) | `elevated` | `outlined` | `hoverable` lift.

## Dialog, Sheet

**Files:** `dialog.tsx`, `sheet.tsx` (Radix + themes).  
Escape closes; focus management handled by Radix.

## Tabs

**File:** `tabs.tsx`  
Use `TabsListSliding` + `syncValue={value}` for the animated pill indicator.

## Toast

**API:** `sonner` — `toast.success`, `toast.error`, etc.  
**Provider:** `AppToaster` in root layout.

## DropdownMenu, Tooltip, Avatar, Badge, Separator, Skeleton

See respective files; **Tooltip** default delay 400ms via `TooltipProvider`.

## Layout helpers

`stack.tsx`, `row.tsx`, `container.tsx`, `grid.tsx` — gap props map to spacing scale.

## Empty state

**File:** `components/chrome/empty-state.tsx` — icon, title, description, actions.

## Icons

**File:** `components/icons/index.ts` — re-exports Lucide icons + `ForgeLogo` from `components/icons/logo.tsx`.

## App shell (authenticated)

**Layout:** `app/(app)/layout.tsx` wraps content in `AppShell` — fixed sidebar (desktop) or slide-out `Sheet` (mobile via `TopBar`), `TopBar`, scrollable `<main id="main-content">`.

| Component | Role |
|-----------|------|
| `components/chrome/sidebar.tsx` | Primary nav (Dashboard → Studio → Analytics → Settings), workspace switcher + create workspace, plan usage bar, account menu, collapse control (`220px` / `58px`, persisted via Zustand + `PATCH /auth/me/preferences` `sidebar_collapsed`). |
| `components/chrome/top-bar.tsx` | Breadcrumb trail, command search affordance, notifications sheet, mobile menu trigger. |
| `components/chrome/page-header.tsx` | Shared page title + optional description + single optional `actions` slot — avoid duplicating global actions already in the sidebar (e.g. second “Open Studio”). |
| `providers/session-provider.tsx` | `useForgeSession()` / **`useSession()`** — `me`, memberships, active org, `setActiveOrganizationId` (calls `POST /auth/switch-org`, invalidates queries, navigates to `/dashboard`). |
| `components/chrome/onboarding-gate.tsx` | Redirects to `/onboarding` when brand color missing and no pages (unless skipped for org). |
| `hooks/use-app-toast.ts` | **`useToast()`** — `success` / `info` ~4s; **`error`** persists until dismissed. Import: `import { useToast } from "@/hooks/use-app-toast"`. Global host: `AppToaster` (`components/ui/toaster.tsx`, Sonner). |

**Settings:** `app/(app)/settings/layout.tsx` — horizontal tabs only (Profile … Notifications); **no nested settings sidebar.**

**Shortcuts:** `hooks/use-shortcuts.ts` — `⌘/Ctrl+K` palette, `G` then `D`/`S`/`A`, `?` help (see `ShortcutsDialog`).

## Studio

**File:** `components/studio/studio-workspace.tsx` — empty state → split-screen (SSE generate/refine), dark chat + preview iframe, section edit popup (`FocusScope`), publish dialog, Zustand session persistence (`stores/studio-store.ts`). **Shell event:** `lib/shell-events.ts` `SIDEBAR_AUTO_COLLAPSE_EVENT` — `AppShell` collapses sidebar when Studio goes active.

**Related:** `lib/studio-buffer.ts` (60ms flush), `lib/sse.ts`, `studio-page-artifact-card.tsx`, `studio-publish-dialog.tsx`.

## Managerial surfaces (Mission FE-05)

| Area | Location |
|------|----------|
| Dashboard | `components/dashboard/dashboard-view.tsx`, `dashboard-page-card.tsx` — filters/search in URL, cards, optional `preview_image_url` |
| Page Detail | `app/(app)/pages/[pageId]/layout.tsx` — breadcrumb, actions, **tabs** (Overview / Submissions / Automations / Analytics), `layoutId` indicator |
| Submissions | `components/submissions/submissions-panel.tsx` — expand-in-place rows, bulk bar, reply, CSV, poll |
| Automations | `app/(app)/pages/[pageId]/automations/page.tsx` |
| Deep link | `app/(app)/pages/[pageId]/submissions/[submissionId]/page.tsx` → `?expand=` |
