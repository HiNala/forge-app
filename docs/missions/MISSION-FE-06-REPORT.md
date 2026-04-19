# Mission FE-06 — Analytics, Settings, Team & Billing UI — report

**Branch:** `mission-fe-06-analytics-settings`  
**Date:** 2026-04-19  

## Summary

Analytics and administrative surfaces use **only real API data**: page-type-aware **Page analytics** (`components/analytics/page-analytics-view.tsx`) with URL `?range=7d|30d|90d`, **KPI cards** with optional **view trends** when at least two daily points exist, **Recharts** plus **“View as table”** (`ChartTableToggle` in `analytics-shared.tsx`), and **org analytics** (`org-analytics-view.tsx`) with workspace name, submissions-this-month hero, top pages, and recent submissions. **Settings** use horizontal tabs (`settings/layout.tsx`) for Profile, Workspace, Brand (live preview + auto-save indicator), Team (invites, seats, role tooltips, remove confirmation dialog), Billing (Stripe checkout + portal + invoices + trial / payment-failure banners), Integrations, and Notifications.

## Implementation notes

| Area | Details |
|------|---------|
| Page KPI trends | `KpiCard` accepts optional `trend` (daily points); sparklines render only when `length >= 2`. |
| Form funnel | Three steps match backend events (`form_start`, `form_field_touch`, `form_submit`). |
| Proposal | Accepted / Declined / **Still reviewing** (derived from unique visitors vs accept+decline counts, capped), Views + trend, scroll depth, section attention table; per-recipient rows remain **not in API** — copy states that honestly. |
| Devices chart | Pie segments use **accent-only** `color-mix` steps (no rainbow). |
| Org header | Loads workspace name via `getOrg`. |
| Profile | Display name saves on **blur**; **Saved** via `aria-live`; Google **Unlink** calls Clerk `destroy()` when present. |
| Team | Remove uses **Dialog** (`role="alertdialog"`) instead of `window.confirm`; last-owner role change uses **Tooltip**. **Last active** shows “not tracked yet” until API exposes it. |
| Brand | **Saved** indicator (2s) after successful `putBrand`. |
| Calendars settings | Fixed `activeOrganizationId` wiring from `useForgeSession` (was breaking `tsc`). |

## Verification

```bash
cd apps/web
pnpm exec tsc --noEmit
pnpm exec vitest run src/components/analytics/
pnpm exec eslint src/components/analytics/ ...
```

## Mission checklist — deferred / CI

| Item | Status |
|------|--------|
| E2E Stripe / team invite / brand (Playwright) | `e2e/mission-fe-06.spec.ts` **skipped** — needs signed-in storage state + Stripe test keys. |
| Axe on app shell routes | Same constraint as FE-05: needs authenticated fixture (see `e2e/app-shell.spec.ts`). |
| Ownership transfer + password | API is **single-step** `POST /team/transfer-ownership`; Clerk password re-verification is **not** wired — dialog copy notes org/account policies. |
| Backend: proposal per-recipient viewers, member `last_active` | Not in API yet; UI does not invent data. |

## Acceptance

- Charts and KPIs show **zeros** and empty states instead of placeholders.  
- Settings favor **auto-save**; destructive flows use **dialogs** and typed confirmation where specified.  
- Billing uses **Stripe Checkout** and **Customer Portal**; cancellation remains in the portal only.
