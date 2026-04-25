# MISSION FE-03 — App Shell, Authentication Flow & Onboarding

**Goal:** Build the container every authenticated screen lives inside — the sidebar, the top bar, the workspace switcher, the account menu, the global toast pipe. Build the onboarding wizard that new users see on first login. Establish the navigation architecture so no screen ever has two competing sidebars, no button ever appears in two places doing the same thing, and every destination is reachable from exactly one path. After this mission, the authenticated surface has a spine. Subsequent missions fill in the limbs.

**Branch:** `mission-fe-03-app-shell`
**Prerequisites:** FE-01 and FE-02 complete. Design system primitives available. Sign-in + sign-up funnel routes users here.
**Estimated scope:** Medium. Mostly composition and navigation architecture. The spine, not the organs.

---

## The Mixture of Experts Lens for This Mission

- **Raskin** — *"Does the user always know what to do next? Are there unnecessary modes, settings, or decisions?"* The sidebar is the map of the product. It must be obvious.
- **Norman** — *"What mental model will users form about this?"* The workspace switcher is the single cue that teams exist. It must communicate structure without requiring explanation.
- **Engelbart** — *"What happens after the first action?"* Onboarding flows must lead to something useful, not a dead-ended dashboard.
- **Ive** — *"Is the product understandable at a glance?"* One sidebar. Never two.
- **Tesler** — *"Does the system adapt to humans?"* Sidebar collapse persists. Active workspace persists. The app remembers.

---

## How To Run This Mission

Read the uploaded `Forge_App_v6.html` file — pay attention specifically to: (a) the sidebar structure and collapse behavior, (b) the absence of nested sidebars in Settings, (c) the workspace switcher position, (d) the way Studio auto-collapses the sidebar in active state.

One rule that cannot be broken: **there is never more than one primary navigation per screen.** If Settings needs sub-navigation, it is a horizontal tab strip inside the content area, not a second sidebar. Same for Page Detail, Analytics, etc.

Commit on each boundary: shell scaffolded, sidebar with collapse, workspace switcher, account menu, onboarding wizard, route guards, toast pipe.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**

---

## TODO List

### Phase 1 — Route Groups & Guards

1. Create `apps/web/src/app/(app)/layout.tsx` — the authenticated layout. This is where the sidebar, top bar, and main content area live.
2. Add `middleware.ts` at the project root (if not already) that checks auth on every `/app/*` path and redirects to `/signin` with a `?redirect=` param if unauthenticated.
3. Add server-side session validation in `(app)/layout.tsx` — fetch `GET /api/v1/auth/me` via the typed API client and pass down via React context provider. Any 401 forces a client-side redirect to `/signin`.
4. If the user has no organizations or the default org has never been onboarded (BrandKit is empty AND no Pages exist), redirect to `/onboarding` on first load.
5. Expose session via `useSession()` hook that returns `{user, memberships, activeOrg, isLoading}`. All downstream components consume this.

### Phase 2 — Sidebar

6. Build `components/app/Sidebar.tsx`. Fixed-left, vertical flex, full height.
7. Top of sidebar: the Forge logo mark + workspace name. Clicking this opens the workspace switcher dropdown.
8. Middle of sidebar: navigation links. Order matters:
    - **Dashboard** (home icon)
    - **Studio** (plus-circle icon, always prominent — this is the primary action)
    - **Analytics** (chart icon)
    - **Settings** (gear icon, bottom of the middle group)
9. Below navigation: a usage progress bar (thin, bottom of sidebar) showing "{x}/{y} pages this month" with color that transitions amber at 80%, red at 100%. Clicking it routes to `/settings/billing`.
10. Bottom of sidebar: user avatar + name + a dropdown arrow. Clicking opens the account menu.
11. Collapse behavior: a small collapse button on the sidebar's right edge. Clicking toggles width between `220px` (expanded) and `58px` (collapsed). Collapsed state shows only icons with a tooltip on hover showing the label.
12. Persist collapsed state in Zustand store + localStorage AND sync to the server (`PATCH /api/v1/auth/preferences` endpoint accepting a `sidebar_collapsed: boolean` field — add this endpoint to the backend in this mission).
13. Transition the collapse with `cubic-bezier(0.22, 1, 0.36, 1)` at `240ms` (use motion tokens from FE-01).
14. Active nav link: accent-colored background + accent text. Inactive: text-muted. Hover: text color shifts to `--color-text`.

### Phase 3 — Workspace Switcher

15. Workspace switcher opens as a Popover anchored to the sidebar logo section. Lists all memberships the user has.
16. Each row: workspace logo + name + role badge. Active workspace has a checkmark.
17. Below the list: a "+ Create workspace" action that opens a dialog prompting for a name. Calls `POST /api/v1/org`, auto-switches to the new workspace, routes to `/onboarding`.
18. Switching workspaces calls `POST /api/v1/auth/switch-org`, invalidates all React Query caches, and routes to `/dashboard` (never lands on a page-detail route from the previous workspace).

### Phase 4 — Account Menu

19. Account menu (bottom-of-sidebar dropdown or slide-out from user avatar): account email (display only), "Profile settings" link, "Billing" link, a theme toggle placeholder (disabled for MVP), "Sign out" action.
20. Sign out clears session cookies, calls `POST /api/v1/auth/signout`, routes to `/signin`.

### Phase 5 — Main Content Area

21. Main area is a `<main>` flex-1 column with no fixed chrome of its own. Individual screens bring their own headers and layouts.
22. Every screen uses a shared `PageHeader` component with props: `title`, `description?`, `breadcrumb?`, `actions?`. Never more than one action button in the header. Never a redundant "New page" button if the sidebar already has Studio.
23. The main area scrolls independently of the sidebar — `overflow-y: auto` on main, fixed-position sidebar.

### Phase 6 — Global Toast Pipe

24. Build a `ToastProvider` at the app layout level. Uses the Toast primitive from FE-01.
25. Expose via `useToast()` hook returning `{success, error, info}`. All mutations in downstream missions use this.
26. Toasts stack bottom-right on desktop, bottom-center on mobile (under the safe-area inset on iOS).
27. Default dismiss after 4s; errors persist until dismissed manually.

### Phase 7 — Onboarding Wizard

28. Build `(app)/onboarding/page.tsx` as a single-screen wizard (not multi-step — keep it to ONE screen with three fields). Per the user case reports: workspace name, brand primary color, logo upload. All optional except workspace name.
29. Layout: centered max-width card on the warm background. Big serif greeting ("Let's get you set up"). Below: the three fields stacked, each with a helpful one-liner below the label.
30. Logo upload: drag-drop zone with fallback click-to-upload. Shows a preview thumbnail after upload. Replace/remove actions.
31. Color picker: swatch picker with 8 curated starting colors + a "pick custom" option opening an HTML5 color input.
32. "Finish setup" primary button at the bottom; "Skip for now" secondary link.
33. On submit: `PUT /api/v1/org/brand` + `PATCH /api/v1/org` with the name, then route to `/dashboard`.
34. Dashboard's empty state (no pages yet) shows a welcome message and a prominent "Open Studio" CTA.

### Phase 8 — First-Run Educational Nudges

35. On first Dashboard visit after onboarding, show a one-time dismissible banner: "Tip: Click Studio to describe your first page." Stores dismissal in user preferences (same endpoint as sidebar collapse).
36. On first Studio visit (no pages exist yet), the empty-state chips are the primary path. No tutorial overlay.

### Phase 9 — Route Stubs for Subsequent Missions

37. Create placeholder page files (rendering a simple "coming soon" EmptyState) for:
    - `(app)/dashboard/page.tsx`
    - `(app)/studio/page.tsx`
    - `(app)/pages/[pageId]/page.tsx`
    - `(app)/pages/[pageId]/submissions/page.tsx`
    - `(app)/pages/[pageId]/automations/page.tsx`
    - `(app)/pages/[pageId]/analytics/page.tsx`
    - `(app)/analytics/page.tsx`
    - `(app)/settings/page.tsx` (redirects to `/settings/profile`)
    - `(app)/settings/profile/page.tsx`
    - `(app)/settings/workspace/page.tsx`
    - `(app)/settings/brand/page.tsx`
    - `(app)/settings/team/page.tsx`
    - `(app)/settings/billing/page.tsx`
    - `(app)/settings/integrations/page.tsx`
    - `(app)/settings/notifications/page.tsx`
38. These stubs exist so the sidebar links don't 404. Subsequent missions fill them in.

### Phase 10 — Settings Chrome (No Nested Sidebar Ever)

39. `(app)/settings/layout.tsx` — the Settings layout uses a horizontal Tabs strip at the top of the content area. Links: Profile · Workspace · Brand · Team · Billing · Integrations · Notifications. Sliding indicator animates between tabs via Framer Motion `layoutId`. No secondary sidebar. This is non-negotiable.
40. Route-aware active tab state: reading the URL, not local state, so deep links work.
41. Tab content transitions between routes with a gentle `fadeIn` motion (no slide — slide on navigation feels cheap).

### Phase 11 — Keyboard Shortcuts

42. Global shortcuts:
    - `Cmd+K` / `Ctrl+K` — opens a command palette (implement in FE-07 polish; wire the key handler as a stub now).
    - `G then D` — go to Dashboard.
    - `G then S` — go to Studio.
    - `G then A` — go to Analytics.
    - `?` — opens a shortcuts cheat-sheet modal listing every shortcut.
43. Shortcuts live in a central `use-shortcuts.ts` hook consumed at the app layout level.

### Phase 12 — Tests & Docs

44. E2E test: sign in, land on onboarding (first time), fill in the wizard, land on dashboard with the workspace name in the sidebar.
45. E2E test: sign in as a user with multiple workspaces, switch workspace, verify correct dashboard loads.
46. Test: collapse sidebar, reload page, verify collapsed state persists.
47. Axe-core on the app shell. Zero violations. Sidebar nav links are keyboard-accessible in both expanded and collapsed states (tooltips announced correctly to screen readers via `aria-label`).
48. Update `docs/design/COMPONENTS.md` with the app-shell components.
49. Mission report.

---

## Acceptance Criteria

- Every authenticated route renders inside the shared shell with sidebar + main content.
- Sidebar collapses, expands, and persists its state across sessions.
- Workspace switcher lists all memberships and switches correctly, invalidating caches.
- Onboarding wizard completes in one screen and routes to the dashboard.
- Settings uses a horizontal tab strip. Zero nested sidebars anywhere in the app.
- All sidebar links reach valid (even if stubbed) destinations.
- Keyboard shortcuts work as specified.
- Mobile responsive: sidebar collapses to a slide-out Sheet on narrow viewports.
- Axe-core clean.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
