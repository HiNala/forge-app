# MISSION FE-06 — Analytics, Settings, Team & Billing UI

**Goal:** Build the data-surfacing and administrative surfaces. Analytics gives Lucy page-type-specific insights — form funnels for forms, scroll-depth for proposals, conversions for landing pages. Settings (via a single horizontal tab strip) covers Profile, Workspace, Brand Kit, Team, Billing, Integrations, Notifications. Every chart shows only real data. Every setting auto-saves. Every payment touch-point feels trustworthy.

**Branch:** `mission-fe-06-analytics-settings`
**Prerequisites:** FE-05 complete. Backend Mission 06 has wired analytics ingestion, Stripe webhooks, team invitations, quota enforcement.
**Estimated scope:** Medium. Volume of surfaces, but most are form-like.

---

## The Mixture of Experts Lens for This Mission

- **Tufte** — *(by proxy through Nielsen and Ive)* — High data-ink ratio. Charts should show the data, not decorate it.
- **Garrett** — *"Is the structure coherent? Does the experience tell a consistent story?"* Analytics adapts to page type but feels like one coherent system.
- **Engelbart** — *"What new capabilities does this unlock?"* A funnel showing "80% drop off at the phone number field" is a capability — it tells Lucy to remove or soften that field.
- **Rams** — *"Will this still feel good in ten years?"* No dashboard theatrics. Numbers that matter, elegantly presented.
- **Ive** — *"Does every element serve a purpose?"* No fake sparklines.
- **Raskin** — *"Does the interface interrupt flow?"* Auto-save everywhere. No Save buttons in Settings unless absolutely necessary.

---

## How To Run This Mission

No fake metrics. This rule applies with extra force here. If a chart has no data, it shows an empty state with a clear explanation, not dummy bars. If a number is zero, it displays as zero, not as "–" or "coming soon." Users trust products that tell them the truth about their own data.

For Settings, the discipline is **auto-save everywhere reasonable.** Toggles, single-input fields, dropdowns all save on change. Multi-field editors (brand kit, email template) save on blur or debounced 500ms after last edit. The exception is destructive actions (delete account, transfer ownership) which require explicit confirmation.

Commit on each surface: analytics for forms, analytics for proposals, org analytics, Profile settings, Workspace settings, Brand Kit editor, Team management, Billing page with Stripe portal, Integrations tab, Notifications settings.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**

---

## TODO List

### Phase 1 — Analytics Tab (Page Detail)

1. `(app)/pages/[pageId]/analytics/page.tsx`. The tab adapts its layout to `page.page_type`.
2. Shared top row across all types: Range selector (7 / 30 / 90 days). URL-synced: `?range=30d`.
3. Shared KPI card row: Views · Unique visitors · Submissions · Submission rate — or swap the last two based on page type (Proposal: Accepted / Accept rate).
4. KPI card anatomy: small label (muted), large number (serif), tiny sparkline trend (only if there's enough data to show one — no fabricated curves).
5. **Forms analytics** (booking / contact / RSVP): hero KPI row + Funnel visualization (form_start → first_field_touch → last_field_touch → form_submit) as a horizontal stepped bar. Below: a field-by-field drop-off table showing each form field and % of users who interacted with it, sorted by drop-off severity (worst first). Below that: traffic sources (referrers) and device breakdown.
6. **Proposal analytics**: hero KPI row with Accepted / Declined / Still reviewing. Scroll-depth histogram (what % scrolled to 25% / 50% / 75% / 100%). Section dwell heatmap (how long each section held attention). Below: the list of individual viewers (for proposals sent to specific recipients) — each with view count, total time, max scroll, and final action.
7. **Landing page analytics**: hero KPI row with Views, Unique, CTA clicks, Conversion rate. Referrer breakdown + device breakdown. No funnel (not applicable).
8. **Gallery / menu analytics**: simplified — views, unique, average time on page, top referrers.
9. Charts use Recharts (installed via shadcn). Single-series line charts for trend, horizontal bar for funnels, list-with-bars for categorical data. Color: the brand accent; no rainbow palettes.
10. Empty state per chart: if zero data for the chosen range, show a centered message instead of empty axes. "No events in the last 7 days" with a helper "Share your page to start seeing data."

### Phase 2 — Org-Wide Analytics

11. `(app)/analytics/page.tsx`. Aggregate view across all pages in the org.
12. Header: org name, range selector.
13. Big number at the top: total submissions this month (with a tiny trend indicator comparing to last month).
14. Below: three smaller KPIs — Pages live, Team members active, AI generations this month.
15. Section: top pages by submissions — a table with page name, submissions count, submission rate, a chevron to navigate into the page's detail analytics.
16. Section: activity feed — last 20 submissions across all pages with timestamps and a chevron into each.
17. Range selector URL-synced. Empty state: if no pages yet, show a gentle "No pages yet" with a Studio CTA.

### Phase 3 — Settings Shell (Already Established in FE-03)

18. Verify `(app)/settings/layout.tsx` from FE-03 uses horizontal tabs. Add any missing tabs this mission populates.
19. Tabs order: Profile · Workspace · Brand · Team · Billing · Integrations · Notifications.

### Phase 4 — Profile Settings

20. `(app)/settings/profile/page.tsx`. Form with: display name (auto-save on blur), avatar upload (same drag-drop pattern as the logo upload in onboarding), email (read-only; changing email is an account-level action deferred to the auth provider's portal).
21. Below: "Connected accounts" — shows Google if OAuth was used for signup. Allows unlinking (with warning).
22. Below: "Delete my account" — destructive action behind a Dialog with typed confirmation ("delete my account") and explicit 30-day grace disclosure.

### Phase 5 — Workspace Settings

23. `(app)/settings/workspace/page.tsx`. Fields: workspace name (auto-save), workspace slug (auto-save with live availability check), timezone (auto-save).
24. Below: "Danger zone" card with "Delete workspace" action. Same typed-confirmation pattern. Only available to the Owner.
25. Below: "Transfer ownership" link that opens a Dialog flow — pick a member from a dropdown, confirm with re-entering password, swap roles atomically.

### Phase 6 — Brand Kit Editor

26. `(app)/settings/brand/page.tsx`. Two-column layout: left = controls, right = live preview.
27. Left column controls:
    - Logo upload (drag-drop + file input, PNG/JPEG/SVG/WebP up to 2MB, shows preview with replace/remove).
    - Primary color (swatch picker + hex/oklch input; invalid values show inline error).
    - Secondary color (same).
    - Display font (dropdown of 8 curated fonts with live previews of each option).
    - Body font (dropdown).
    - Brand voice note textarea: "Describe how your brand speaks. Example: 'friendly but professional, no jargon.'"
28. Right column: a miniature page preview showing how the brand kit will be applied — a mock hero, a mock form, mock CTA, all styled with the current kit. Updates live as the user edits.
29. Auto-save on blur for text fields, on change for pickers and dropdowns. Small "Saved" indicator appears for 2s after each save.
30. Note at the bottom: "Changes apply to new pages you create. Existing live pages keep their current branding until you edit and republish them." This is a critical trust-building clarification per the PRD.

### Phase 7 — Team Management

31. `(app)/settings/team/page.tsx`. Table of members with columns: avatar + name, email, role (inline-editable dropdown for Owner; disabled display for others), joined date, last active.
32. Owner can change any member's role. Cannot demote themselves if they're the last Owner (enforced both client-side and backend — show a tooltip explaining why on the disabled dropdown).
33. Remove member button (trash icon) on each row (Owner only). Confirms via Dialog listing what the removed member loses access to.
34. Top-right: "Invite member" primary button opening a Dialog with: emails textarea (comma or newline separated), role selector (Editor default, Owner restricted to confirmation), "Send invites" action.
35. Pending invitations section below the active members table: email, role, invited by, sent date, actions (Resend, Cancel).
36. Plan seat tracking: "Using 3 of 10 seats" subtle indicator next to the Invite button. Disabled if at limit with upgrade CTA.
37. Empty state for solo workspaces: "Invite your team" with an inline invite form.

### Phase 8 — Billing

38. `(app)/settings/billing/page.tsx`. Top card: current plan name + monthly price + next invoice date + payment method last4.
39. If trialing: a sticky-ish banner at the top showing "{n} days left in your Pro trial" with an "Add payment method" action.
40. Usage card: three progress bars for the current period — Pages generated (x/limit), Submissions received (x/limit), AI tokens consumed (x/limit). Each bar turns amber at 80%, red at 100%.
41. Plan comparison: "Upgrade" or "Change plan" button opens a Dialog showing the three tiers with features and a CTA per tier. Clicking a CTA calls `POST /api/v1/billing/checkout` and redirects to Stripe Checkout.
42. Invoices section: list of past invoices (month, amount, status) with download links (retrieved from Stripe).
43. "Manage billing details" button calls `POST /api/v1/billing/portal` and redirects to the Stripe customer portal for payment method and plan management.
44. "Cancel subscription" lives in the portal, not our UI. Do not duplicate it.
45. Payment failure state: if the latest invoice status is `payment_failed`, show a red banner "Payment failed — update your payment method to keep your pages live" with a portal button.

### Phase 9 — Integrations

46. `(app)/settings/integrations/page.tsx`. List of integration cards:
    - **Google Calendar** — connect/disconnect button, shows connected email if linked.
    - **Apple Calendar** — "Coming soon" disabled state.
    - **Slack** — "Coming soon" disabled state.
    - **Zapier** — "Coming soon" disabled state.
    - **Custom webhooks** — "Coming soon" disabled state.
47. Each card: icon, name, one-line description of what the integration does, status indicator, primary action.

### Phase 10 — Notifications

48. `(app)/settings/notifications/page.tsx`. Toggles for:
    - Daily digest of failed automations (email) — on by default.
    - Weekly submissions summary (email) — off by default.
    - Product updates from Forge (email) — on by default, with a gentle disclosure.
    - Billing alerts (cannot be disabled — greyed out with explanation).
49. Auto-save on toggle change. Tiny "Saved" indicator.

### Phase 11 — Accessibility & Responsive

50. Every auto-saving control announces saves to screen readers via an `aria-live="polite"` region near each section.
51. Destructive action dialogs use proper `role="alertdialog"` with focused "Cancel" button by default (safe choice).
52. Every form field has a visible label and proper `aria-describedby` for helper text and errors.
53. Charts have accessible alternatives: a toggle near each chart opens a `<table>` view with the same data.
54. Mobile: analytics charts simplify to essential KPI cards; drill-down into detail is a separate view. Team table collapses to card layout per-member.

### Phase 12 — Tests

55. E2E: complete a Stripe test checkout end-to-end, verify the plan updates in the UI after webhook processing.
56. E2E: invite a team member, accept via a mocked invitation link, verify they appear in the members list with the right role.
57. E2E: edit brand kit, see the live preview update, refresh the page, verify it persists.
58. Test: analytics charts render the empty state for a brand-new page (zero events).
59. Test: funnel correctly visualizes a scenario with 100 starts, 60 touches, 40 submits.
60. Axe-core clean on every settings tab and analytics screen.
61. Mission report.

---

## Acceptance Criteria

- Analytics screens are page-type-aware and show only real data.
- Every settings surface auto-saves reasonably and confirms save state.
- Billing integrates with Stripe Checkout and Customer Portal; webhook-driven plan updates are reflected in the UI.
- Team management supports invitations, role changes, ownership transfer, and seat limits.
- Brand kit editor has a live preview that updates as the user edits.
- Integrations surface honestly shows what's live vs coming soon.
- No fake data anywhere in any chart.
- Axe-core clean across every new screen.
- Mission report written.

---

## Repo tracking (living)

Current depth vs this brief: **[FRONTEND_STATUS.md](./FRONTEND_STATUS.md)** · Shipped scope: [MISSION-FE-06-REPORT.md](../MISSION-FE-06-REPORT.md)

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
