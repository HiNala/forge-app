# V2 MISSION P-10 — The Catch-All: Everything The Missions Didn't Quite Cover

**Goal:** Honest sweep through everything that the prior missions assumed, implied, or kicked down the road. Every "we'll handle this in another mission" comment, every TODO that referenced "future work," every assumption that didn't get its own mission. This mission is the trash compactor — small, scattered, important fixes that don't deserve a full mission but together close the gaps that would otherwise show up as bugs the day after launch. After this mission, Forge has no orphaned features, no half-wired surfaces, no "Coming soon" buttons that were supposed to be live, no settings that read but don't write, no documentation that points to nonexistent runbooks. Plus the user-experience details a careful product would have but a rushed one wouldn't: undo, keyboard shortcuts, sensible defaults, friendly redirects, real loading states.

**Branch:** `mission-v2-p10-catch-all-polish`
**Prerequisites:** Every other mission complete or substantively in progress. This mission is meant to land just before the FINAL_SMOKE_TEST_POLISH walkthrough.
**Estimated scope:** Medium. Most items are small (1-3 hours each) but there are many. Allocate two solid days; budget for an additional day of slip.

---

## Experts Consulted On This Mission

- **Tony Fadell** — *Whole-product thinking. The user's experience is everything you forgot to plan, not just the headlines.*
- **Jef Raskin** — *Modes are mostly bad; orphaned modes are worst. Find the half-implemented states and either complete them or remove them.*
- **Don Norman** — *Affordance includes recovery. If a user can do X, they can probably undo X. Did we wire that up?*
- **Linus Torvalds** — *The boring details of operations are where systems fail. Logging, retries, edge cases. Sweep them all.*

---

## How To Run This Mission

The discipline is **systematic searching**, not from-scratch design. For each category below, walk the codebase, run grep against TODO/FIXME/HACK comments, walk the product surface-by-surface, and compile lists. Then triage each list:
- **Fix now** — small, in-scope, important.
- **Defer to a real mission** — too big or unclear; document for later.
- **Drop** — not actually needed; remove the orphan code or copy.

A high-functioning version of this mission produces 30-50 small commits across two days, each of them addressing a specific thing the user would otherwise notice on day three of using Forge. The mission is "done" when grep returns an acceptable level of orphans and the manual walk doesn't surface new ones.

Commit on milestones: TODO sweep, half-wired feature audit, missing docs/runbooks, undo/redo, keyboard shortcuts, internationalization basics, error-recovery surfaces, the small-but-noticeable details, mission report.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — TODO/FIXME/HACK Sweep

1. Run `grep -rn "TODO\|FIXME\|HACK\|XXX" apps/api/app apps/web/src` and capture the result. For each, decide: address now, ticket for later (with explicit issue link), or remove the comment because the concern has been addressed.
2. Search for inline `# nosec`, `# type: ignore`, `// @ts-ignore`, `// @ts-expect-error` — anywhere we're suppressing safety checks. For each, document why or remove the suppression.
3. Search for `console.log`, `print(`, `pprint`, `breakpoint()`, `debugger;` left in production code. Remove unless they're inside an explicitly-gated debug block.
4. Run `pnpm depcheck` and `uv pip check` to find unused dependencies. Remove them. Reduces install time and attack surface.
5. `git log --oneline | grep -i "wip\|temp\|fix later\|hack"` — identify suspicious historic commits whose work might be incomplete. Spot-check and fix.

### Phase 2 — Half-Wired Features

6. Walk every menu, dropdown, button, and settings panel. Click each. List anything that:
    - Opens an empty modal.
    - Routes to a 404.
    - Says "Coming soon" but isn't roadmapped.
    - Successfully POSTs but silently fails downstream (e.g., a "Send invitation" button that POSTs but the email never sends because the worker isn't wired).
7. Specifically verify:
    - Every Settings tab actually saves what it appears to save (audit each `PATCH` endpoint exists and the corresponding row updates).
    - Every "Resend invitation" button actually queues a job.
    - Every "Disconnect integration" button actually revokes the OAuth token (not just removes the local row).
    - Every "Export" button produces a real export.
    - Every webhook test fires a real test event.
    - Every "Cancel subscription" flow actually cancels in Stripe (not just locally).
8. For any half-wired feature, three options: **wire it up properly** (preferred), **hide it behind a feature flag** (acceptable for soft-launch features), or **remove the surface** (if it was speculative). Pick one per item; don't leave anything in a third state.

### Phase 3 — Undo, Redo, and Recovery

9. Audit destructive actions for undoability. The user-friendliness rule: every destructive action under 10 seconds old should be undoable via a toast.
    - Delete a page → toast "Page deleted" with "Undo" button (5s window).
    - Archive a page → "Archived. Undo."
    - Remove a team member → "Member removed. Undo." (15s window since this is more impactful).
    - Delete a custom domain → no undo; explicit confirmation dialog instead.
    - Delete an org → no undo; 30-day grace period from BI-04 substitutes.
    - Discard unsaved Studio changes → "Discarded. Undo" (15s window).
10. Implement the undo pattern: backend supports a "soft delete" with a per-resource `pending_delete_at` column for resources that allow undo, with a worker job that hard-deletes after the undo window. Frontend toast issues a `POST /restore` to undo.
11. Recovery from common errors:
    - Stripe checkout failure → friendly error with "Try a different payment method" CTA.
    - LLM provider all-down → "AI is unavailable. Your draft is saved. Try again in a moment."
    - Quota exceeded → upgrade prompt with the specific quota mentioned.
    - Session expired during a long Studio generation → re-auth dialog without losing the prompt.
12. Form-state recovery: if the user navigates away from a partially-filled form (Studio prompt, Settings page), the value persists in localStorage and is restored on return for 24 hours.

### Phase 4 — Keyboard Shortcuts

13. Standardize keyboard shortcuts. Add a shortcut cheatsheet on `?` press from anywhere in the app.
14. Global shortcuts:
    - `⌘K` / `Ctrl+K` — command palette (already in F-03; verify still works).
    - `⌘/` — toggle sidebar.
    - `g d` — go to dashboard.
    - `g s` — go to studio.
    - `g a` — go to analytics.
    - `g t` — go to templates.
    - `g p` — go to settings → profile.
    - `?` — open shortcut cheatsheet.
    - `Esc` — close any modal, drawer, or popover.
15. Studio shortcuts:
    - `⌘Enter` — submit prompt.
    - `⌘P` — toggle preview viewport (desktop / tablet / mobile).
    - `⌘B` — bold (in any rich-text region).
    - `⌘Z` / `⌘⇧Z` — undo / redo within Studio.
    - `⌘S` — save (most surfaces auto-save; this is a comfort shortcut that flashes "Saved").
16. Form-builder shortcuts:
    - `Tab` to navigate fields.
    - `Enter` to advance in conversational form mode.
    - `Backspace` at empty field → previous question (conversational).
17. Dashboard shortcuts:
    - `/` — focus search.
    - `n` — new page (workflow picker).
    - `j` / `k` — vim-style row navigation.
    - `Enter` — open the focused row.
18. The cheatsheet route is at `/help/shortcuts` and also a modal triggered by `?`. List shortcuts grouped by surface, with platform-aware (Mac vs Windows) display.

### Phase 5 — Default Data & Sensible Initial States

19. Audit defaults. Where the user gets a blank state, can we pre-fill with a sensible default?
    - New brand kit: pre-fill primary color from the website-extracted brand (V2-P05 / O-01 already does this in onboarding, but a brand kit *created from scratch* should still have warm-cream defaults rather than transparent).
    - New page automation config: notify-owner enabled by default with the org's primary email; confirm-submitter enabled with a default subject "Thanks for getting in touch with {org.name}".
    - New API token: default scope is read-only; user must opt into write scopes.
    - New webhook: default events are `submission.created` (the most-asked-for); user can add others.
    - New custom email template: pre-fills from the system default rather than blank.
    - New slot calendar: business hours default to 9am-5pm Mon-Fri; buffer 0; min-notice 24h; max-advance 60d. The "common case" defaults.
20. Onboarding pre-fills: when a user picks "Contractor" or "Photographer" or "Coach" as their business type during onboarding, the brand kit gets a category-appropriate default voice and the first templates suggested are matched.
21. Pre-load the next-most-likely action. After publishing a page, the suggested next action is "Share it" with the share sheet pre-opened. After receiving the first submission, the suggested next action is "Reply." Forge anticipates.

### Phase 6 — Internationalization & Localization Foundations

22. Forge isn't shipping multi-language at v1, but the foundation should be in place so adding a language later is a configuration change, not a refactor.
23. Audit every user-facing string in the app and confirm it goes through a single translation function (`t("key")` or equivalent). If they're hardcoded, refactor through the function — even with English as the only loaded language for now.
24. Date and number formatting: every `toLocaleString` / `Intl.DateTimeFormat` use carries the user's `locale` from their preferences (already on `users.locale` from BI-04).
25. Currency: every monetary value renders via `Intl.NumberFormat` with the org's currency (default USD) and the user's locale. NOT hardcoded `$X.XX`.
26. RTL preparation: ensure no `padding-left` or `margin-left` is hardcoded where `padding-inline-start` would work. Tailwind's `ps-4`, `pe-4`, `start-0`, `end-0` utilities are the convention. Tedious but pays off.
27. Date/time display: "5 minutes ago" should localize (a Spanish locale would say "hace 5 minutos"). Use `Intl.RelativeTimeFormat`.
28. Public-page renderer: the published page detects the visitor's `Accept-Language` header and uses appropriate date / number formats. The page's content stays the user's content (we don't auto-translate user-written copy).

### Phase 7 — Real Loading States

29. Audit every async operation in the app. For each, verify:
    - **A loading state** is shown (skeleton, inline spinner, or disabled button — never a frozen UI).
    - **A success state** is acknowledged (a toast, an inline checkmark, a state change).
    - **An error state** has actionable copy (per Phase 3).
30. Common offenders:
    - Studio generate has good streaming UX but the "Save brand kit" button is silent on success — add a brief "Saved" inline indicator.
    - Settings tab navigation is instant but feels jarring; a 100ms fade between tabs gives polish without frustration.
    - The submission-list refresh on real-time arrival currently hard-replaces the list; a smoother "new row at top with subtle highlight" treatment is more delightful.
31. Skeletons: build a small set of standard skeleton components matching the most common content shapes (page card, list row, settings field, chart placeholder). Use them universally instead of hand-rolling each.

### Phase 8 — Friendly Redirects & 404s

32. The 404 page: don't show a stack trace or a sad illustration. Show:
    - "We couldn't find that page." (plain language)
    - A search input ("Looking for something?") that searches across the user's pages and templates.
    - A list of common destinations as quick-links.
    - A "Maybe you meant..." section for typo'd URLs (using a Levenshtein match on the user's pages and the templates list).
33. Redirects:
    - When a user changes a page slug, the old slug serves a 301 redirect for 90 days. Logged in `slug_redirects` table.
    - When an org changes its slug, all of its pages' URLs get the same redirect treatment.
    - When a custom domain is removed, the underlying Forge URL still works.
34. 401 (unauthenticated) sends to `/signin?continue={original_url}` so post-signin the user lands where they intended.
35. 403 (authorized but wrong tenant): friendly "This page belongs to a different workspace. Switch?" with a workspace switcher.

### Phase 9 — Email Polish

36. Walk every transactional email and verify:
    - The from-name is the org's name (when org-scoped) or "Forge" (when platform-scoped). Never "no-reply" without context.
    - The reply-to is sensible (set to the org's primary email when org-scoped).
    - The subject line is specific and useful ("New booking from Dan — Tuesday at 2:00 PM" not "You have a new submission").
    - The plain-text fallback exists and is well-formatted (deliverability + accessibility).
    - The unsubscribe link is present where required (digest emails, marketing emails).
    - The email's branded header uses the org's logo and primary color (where the email is org-scoped).
    - All link tracking is opt-in per-email; users who care about privacy can disable.
37. Test rendering across Gmail (web + iOS), Outlook (desktop + web), Apple Mail (Mac + iOS), Yahoo, ProtonMail. Use Litmus or Email on Acid; document failures.

### Phase 10 — Audit Log Completeness

38. The platform audit log (BI-04, GL-02) is meant to capture every meaningful mutation. Sweep the codebase for actions that should be audit-logged but aren't:
    - All Settings changes (most are; verify each).
    - Brand kit changes.
    - Custom domain changes.
    - Webhook config changes.
    - API token creation / deletion.
    - Plan changes.
    - Member role changes.
    - Page publish / unpublish / delete.
    - Integration connect / disconnect.
    - Org delete / restore.
    - Impersonation start / end.
    - Platform role grants / revokes.
39. Verify each audit entry includes the actor, the resource, the change diff, the IP, the user agent, and the timestamp.

### Phase 11 — Documentation Pointers

40. Walk through every `docs/runbooks/*.md` and `docs/architecture/*.md` referenced from across the codebase. Verify every referenced doc actually exists. References to nonexistent docs are a common drift symptom.
41. Verify every external-link in docs is alive (404-checker on the docs folder).
42. Add or fix the missing runbooks that prior missions referenced but didn't actually create:
    - `docs/runbooks/INCIDENT_RESPONSE.md` — what to do when a customer reports broken email / payment / login. Sourced from real common scenarios.
    - `docs/runbooks/COST_ALERT_PLAYBOOK.md` — how to investigate an LLM cost spike.
    - `docs/runbooks/STRIPE_DISPUTE.md` — how to handle a Stripe chargeback / dispute.
    - `docs/runbooks/SUPPORT_PLAYBOOK.md` — common support scenarios with the impersonation + check-list flow.
43. The README at the root: re-verify every command in the README still works on a fresh clone. README drift is the most embarrassing kind.

### Phase 12 — Logging Hygiene

44. Audit log levels across the app. Common bugs:
    - `INFO` logs that should be `DEBUG` (every middleware step doesn't need INFO).
    - `ERROR` logs that should be `WARN` (recoverable failures aren't errors).
    - `WARN` logs that should be `INFO` (a successful retry isn't a warning).
45. Every error log MUST include enough context to debug:
    - Request ID, user ID, org ID, the operation being attempted, the actual error and stack trace.
    - No PII in errors (scrub email/name from log payloads — Sentry's `before_send` already does this; verify).
46. Sentry: verify breadcrumbs are present for the most common debug-from-Sentry flows (a 500 on Studio generate, a webhook failure, a stuck job).

### Phase 13 — Backup Verification

47. The disaster-recovery runbook (GL-04) included a quarterly backup-restore drill. Run one now (off the production-like staging). Time it; document the actual time. If the restore takes longer than the documented RTO, fix the procedure.
48. Verify the encryption-at-rest claim for backups (Railway's managed Postgres + R2 are encrypted; document where the key material lives).

### Phase 14 — Health Check Depth

49. The `/health/deep` endpoint from BI-02 should pass through every external dependency. Verify each:
    - OpenAI: a tiny model call that doesn't cost much.
    - Anthropic: same.
    - Gemini: same.
    - Stripe: a `customers.list(limit=1)` call.
    - Resend: a domain status check.
    - Google Calendar: a token refresh check (against a sentinel test integration).
    - R2/S3: a small put-then-delete on a sentinel object.
    - Postgres: `SELECT 1` plus a row read of a known sentinel row (ensures RLS isn't broken).
    - Redis: PING and GET of a known sentinel key.
50. Each check has a documented expected latency (e.g., Stripe < 500ms p95). Latency above expected for >5 min triggers a yellow status.

### Phase 15 — Smoke Test The Smoke Test

51. Run the FINAL_SMOKE_TEST_POLISH walkthrough on staging once. Note every item that doesn't behave as Phase 18 of that mission expects.
52. Each finding is either a fix in this mission or a deferred ticket. Don't just check off "completed the walk" — check off "completed the walk AND fixed everything actionable."

### Phase 16 — Mission Report

53. The mission report is unusually structured for this catch-all:
    - **What we found and fixed**: a bulleted list of the most impactful improvements.
    - **What we found and deferred**: items that need a real mission, with one-line descriptions and proposed scope.
    - **What we couldn't fix from inside this mission**: external blockers (e.g., a Stripe API change, a Google API rate-limit signal we need to revisit).
    - **Remaining odds and ends**: anything outstanding so the next person knows what's left.

---

## Acceptance Criteria

- TODO/FIXME/HACK sweep complete; remaining items have explicit tickets or rationale.
- No half-wired features in the product surface; every button does what it implies.
- Undo / soft-delete / recovery patterns implemented for every destructive action that warrants them.
- Keyboard shortcuts standardized with a discoverable cheatsheet.
- Sensible defaults applied everywhere a blank state would otherwise greet the user.
- Internationalization foundations in place: every string through a translation function, locale-aware dates and numbers, RTL-friendly layouts.
- Loading and success states present and consistent across every async operation.
- 404 page is helpful; redirects work for renamed slugs and orgs.
- Transactional emails are polished, branded, deliverable across major clients.
- Audit log captures every meaningful mutation.
- All runbooks referenced by the codebase actually exist and reflect reality.
- Logging levels and contexts are clean.
- Backup-restore drill executed and timed.
- Health-check depth verified.
- Smoke-test walkthrough completes with minimal new findings.
- Mission report structured to surface what's left for the next pass.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
