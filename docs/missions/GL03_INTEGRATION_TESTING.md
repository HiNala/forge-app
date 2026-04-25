# GO-LIVE MISSION GL-03 — Integration Testing, Load Testing & Missing Coverage

**Goal:** Close every remaining gap in test coverage before the product ships. Every prior mission had its own acceptance criteria and tests, but those are unit-scoped and mission-scoped — they don't catch the way two features break each other, how the system behaves under real-world load, or how an attacker could manipulate the product. This mission adds the integration layer: end-to-end Playwright tests across the full user journey, load tests that simulate realistic traffic, security tests that probe for OWASP vulnerabilities, chaos tests that verify degradation paths, and an exhaustive RLS audit that confirms the database enforces tenant isolation across every row in every table. After this mission, Brian can push to production without the 3am dread of "what did I miss?"

**Branch:** `mission-gl-03-integration-testing`
**Prerequisites:** All prior missions complete. All unit tests passing. The FINAL_SMOKE_TEST_POLISH mission's manual walkthrough is done. This mission is the automated version of that discipline, plus everything beyond what one human can walk through.
**Estimated scope:** Large. Test infrastructure setup, Playwright E2E suite, k6 load suites, OWASP ZAP integration, chaos harness, RLS audit tool, visual regression.

---

## Experts Consulted On This Mission

- **Linus Torvalds** — *Every failure mode that can happen, will happen. Exercise them intentionally.*
- **Ken Thompson / Dennis Ritchie** — *Test behavior, not implementation. If the test passes after a refactor, the test is correct.*
- **Jef Raskin** — *Race conditions, timeouts, and partial failures are where users break. Test those before they do.*
- **Don Norman** — *A confusing error message is a bug. Verify every error path produces a useful message.*

---

## How To Run This Mission

Four testing dimensions go in:

1. **End-to-end journeys** (Playwright) — simulates real user flows across the full stack.
2. **Load** (k6) — proves the system can sustain the traffic we expect without falling over.
3. **Security** (OWASP ZAP + hand-written probes) — verifies nothing leaks, nothing injects, nothing escalates.
4. **Chaos** (targeted failure injection) — proves graceful degradation when dependencies fail.

Plus one audit we've been deferring: an **exhaustive RLS verification** that programmatically attempts cross-tenant access on every table, every query shape.

The discipline: **every test is a specification.** A test that fails doesn't mean the test is wrong; the system is wrong. Fix the system. Re-running a flaky test until it passes is a code smell we eliminate by designing tests to be deterministic.

Commit on milestones: Playwright infra up, key user journeys covered, security suite running, load tests in CI, chaos harness working, RLS audit clean, tests green in CI.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — E2E Test Infrastructure (Playwright)

1. Install Playwright at the monorepo root: `pnpm dlx create-playwright@latest`. Point at `apps/web`. Configure for Chromium + WebKit + Firefox. Mobile viewports for iPhone 15 and Pixel 8.
2. Set up a dedicated Playwright CI workflow `.github/workflows/e2e.yml`:
    - Boots the full `docker-compose.ci.yml` stack (API + Worker + Web + Postgres + Redis + MinIO + a mock email inbox via Mailpit).
    - Waits for all services healthy.
    - Runs Playwright against `http://localhost:3000`.
    - Uploads screenshots, videos, and trace files for every failure.
    - Retains artifacts for 30 days for debugging.
3. Create `apps/web/tests/e2e/helpers/` with reusable utilities:
    - `createTestOrg()` — creates a user + org via the API, returns cookies.
    - `createTestPage({workflow, brand?})` — generates a page via Studio stub or direct-DB insert, returns the page.
    - `seedTemplates()` — ensures templates exist.
    - `mockLLM()` — intercepts LLM API calls and returns deterministic responses from a fixture.
    - `flushQueue()` — waits for the arq worker to drain its job queue (used after actions that enqueue jobs).
    - `readMail(email)` — polls Mailpit for the latest email to the given address.
4. Test isolation: every E2E test runs against a fresh org (created in `beforeEach`). No shared state between tests. Runs in parallel across 4 workers.

### Phase 2 — Critical User Journeys (E2E)

5. **The golden path — Contact form with booking**:
    - Sign up → onboarding → pick contact form workflow → generate → publish → visit public URL in a clean browser → fill form → pick slot → submit → verify submission arrives in creator's inbox AND public page shows success → verify confirmation email to submitter with ICS attachment → verify hold became confirmed booking.
6. **The golden path — Proposal**:
    - Create org → generate proposal with realistic line items → edit pricing inline → publish → open in incognito as client → ask a question via inline Q&A → creator (first browser) answers → client accepts with typed signature → verify signed PDF generated → verify email with PDF attachment.
7. **The golden path — Pitch deck**:
    - Create org → generate deck with Sequoia framework → edit a slide via click-to-edit → wait for image generation → publish → open in incognito → scroll through → open presenter mode → arrow-key through → export to PDF → verify PDF download.
8. **Cross-workflow conversion**:
    - Create org → build contact form → submit an inquiry → from submission expand, click "Create proposal for this inquiry" → verify Studio opens with seeded context → generate proposal → confirm client info pre-filled.
9. **Team flow**:
    - Owner creates org → invites teammate via email → teammate receives email (check Mailpit) → clicks magic link → signs up → lands in the right org with Editor role → creates a page → Owner sees it in dashboard.
10. **Billing flow**:
    - New org on trial → upgrade to Pro via Stripe checkout with test card `4242 4242 4242 4242` → webhook fires → verify plan flipped and usage meter reset → open customer portal → cancel subscription → verify downgrade scheduled.
11. **Quota flow**:
    - Starter org → drop plan limits in DB to simulate limit → attempt to generate one more page → verify 402 response and upgrade prompt shown.
12. **Settings flow**:
    - Change brand color → verify brand kit saved + live preview updated.
    - Upload logo → verify appears in brand kit.
    - Create API token → test curl against `/api/v1/pages` with that token → revoke → verify same curl now 401.
    - Add custom domain (mock DNS) → verify domain added in pending state.
    - Create outbound webhook → trigger an event → verify webhook-receiver got the HMAC-signed request.
13. **Public page resilience**:
    - Submit form with JavaScript DISABLED (test via Playwright's `javaScriptEnabled: false`) → verify server-rendered success page shows and submission arrived.
    - Submit form on mobile viewport → verify slot picker is usable via touch.
    - Submit a proposal Accept on slow 3G network (emulated) → verify acceptance completes before timeout.
14. **Admin flow**:
    - Grant Support role to a user via Super Admin → log in as that user → see admin panel → impersonate a test org → perform a read action (view submissions) → exit impersonation → verify audit log shows impersonation entries with correct context.
15. **Error-path flows** — deliberately trigger every user-facing error:
    - Invalid email on signup → friendly validation message.
    - Rate-limited endpoint → "You're moving fast, give it a second."
    - Stripe webhook signature invalid → 400.
    - LLM provider timeout → Studio shows "AI is unavailable right now, try again in a moment" — NOT a stack trace.
    - Public page slug collision on publish → dialog explaining and suggesting an alternative.
    - Invitation token expired → clear message + resend option.

### Phase 3 — Load Testing (k6)

16. Install k6 in CI via the official Docker image. Create `load/` directory at the repo root with scenario files.
17. **Scenario: public-page form submissions at scale**. Simulates 500 concurrent users each submitting a form over 5 minutes.
    ```javascript
    // load/scenarios/public_form_submit.js
    import http from 'k6/http';
    import { check, sleep } from 'k6';
    
    export const options = {
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 500 },
        { duration: '1m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
      },
    };
    
    export default function () {
      const res = http.post(`${BASE}/p/test-org/test-form/submit`, JSON.stringify({
        name: `User-${__VU}-${__ITER}`,
        email: `user${__VU}-${__ITER}@test.local`,
        message: 'Load test submission',
      }), { headers: { 'Content-Type': 'application/json' }});
      check(res, { 'status is 200': (r) => r.status === 200 });
      sleep(1);
    }
    ```
18. **Scenario: analytics ingestion under burst**. 2000 events/sec for 2 minutes, verify no drops beyond the documented backpressure threshold (Phase 5 of GL-01 — threshold 5000 buffered).
19. **Scenario: dashboard read load**. 50 concurrent authenticated users refreshing their dashboard over 5 minutes. p95 < 300ms.
20. **Scenario: Studio generate concurrency**. 10 concurrent users triggering generate on mocked LLM responses. Verifies the graph engine doesn't deadlock, budgets are enforced per-request, SSE connections don't leak.
21. **Scenario: public-page read-heavy**. 1000 concurrent visitors hitting the same published page. p95 < 200ms (cached), p99 < 500ms.
22. **Scenario: mixed realistic traffic**. Weighted combination: 70% public page views, 15% form submits, 10% in-app dashboard use, 5% Studio generate. 30-minute soak test.
23. Run load tests nightly in CI against staging. Regression detection: if p95 degrades > 20% vs the 7-day baseline, alert.
24. Generate a `docs/benchmarks/BASELINES.md` with the latest p50/p95/p99 for each scenario. Update on every major release.

### Phase 4 — Security Testing

25. **OWASP ZAP integration**:
    - CI job `security.yml` runs ZAP's baseline scan against staging weekly.
    - Fail the build on any HIGH-severity finding; warn on MEDIUM; log LOW.
    - Tune ZAP to authenticate via a test session so it scans authenticated surfaces too.
26. **Hand-written security probes** in `tests/security/`:
    - **SQL injection attempts** against every query parameter, form field, and JSON body field. Attempt `'; DROP TABLE pages; --`, `' OR 1=1 --`, common variants. Verify no failure, no data leak, response is normal.
    - **XSS probes**: submit `<script>alert(1)</script>` in every user-input field (form submissions, page titles, prompt, profile fields). Verify rendered pages escape correctly; verify no script execution in the submission viewer or email rendering.
    - **CSRF protection**: attempt state-changing operations without the CSRF token from a separate origin. Verify 403.
    - **IDOR (Insecure Direct Object Reference)**: log in as user A, attempt to access user B's page by ID in URL. Verify 403 or 404 (never returns B's data).
    - **Path traversal**: attempt `../../../etc/passwd` in file upload filenames, in page slugs, in template references. Verify normalized or rejected.
    - **Command injection**: in file uploads and in fields that might end up in shell commands (none should — probe anyway), try `; rm -rf /` and shell meta.
    - **Authentication bypass**: expired JWT, altered JWT (flip a bit), JWT with wrong issuer, JWT with wrong audience. All must fail.
    - **Session fixation**: verify session cookies rotate on login.
    - **Clickjacking**: verify `X-Frame-Options: DENY` or equivalent CSP on sensitive surfaces; verify public Forge pages are framable (we want embed support) but the admin panel is not.
27. **Rate-limit bypass attempts**: rotate User-Agent, rotate X-Forwarded-For header. Verify backend trusts only the configured reverse-proxy hop.
28. **File upload security**:
    - Upload a `.exe` renamed to `.png` (wrong magic bytes) → verify MIME detection based on content + extension match.
    - Upload a 100MB file to a 10MB-limit endpoint → verify rejected with 413.
    - Upload a file with a filename containing null bytes → verify sanitized.
29. **Secrets in URL parameters**: grep every route + every redirect to verify no passwords, tokens, or secrets ever appear as query params (they'd end up in server access logs).
30. **Subresource integrity**: every script loaded from a CDN includes SRI hash. Verify via a CI script that scans HTML output.
31. **Cookie flags**: every auth/session/tracking cookie has `Secure`, `HttpOnly` (where appropriate), `SameSite=Lax` or `Strict`. Test suite inspects `Set-Cookie` headers across every endpoint.

### Phase 5 — Webhook Replay Testing

32. Write `tests/webhooks/stripe_replay.py` that exercises the full Stripe webhook event set:
    - `checkout.session.completed` → org subscription attached, plan flipped.
    - `invoice.paid` → billing status updated.
    - `invoice.payment_failed` → failure banner set, email sent.
    - `customer.subscription.updated` → plan changed.
    - `customer.subscription.deleted` → downgraded to Starter.
    - `customer.subscription.trial_will_end` → 3-day reminder email.
    - Duplicate event (same Stripe event ID) → idempotency check prevents double-processing.
    - Webhook with invalid signature → 400.
    - Out-of-order delivery (subscription.updated before checkout.session.completed) → graceful handling.
33. Similar replay tests for Resend webhooks (delivery, bounce, complaint) and Google Calendar webhooks (event updated, calendar deleted).

### Phase 6 — Calendar & Scheduling Edge Cases

34. DST transition tests:
    - Book a slot at 2:30am on a spring-forward Sunday → the slot shouldn't exist (US tz). Verify.
    - Book a slot at 1:30am on a fall-back Sunday → two valid instants exist; verify the system picks one consistently.
    - User imports ICS from a different timezone than their business settings → verify events normalize to UTC and display in the creator's TZ on the admin view but the submitter's TZ on the public page.
35. Recurring event edge cases:
    - RRULE with COUNT=100 → all 100 occurrences expanded.
    - RRULE with no end and no count → capped at 6-month horizon per Phase 2 of W-01.
    - EXDATE excluding one occurrence → that date not in busy blocks.
    - FREQ=WEEKLY;INTERVAL=2 (biweekly) → correctly expanded.
36. Concurrent slot-hold race: two visitors click the same slot in the same second. Exactly one succeeds (via GiST EXCLUDE constraint). The other sees "That time was just taken."
37. Hold expiry: create hold, wait 16 minutes (mock time), verify expired_at transition, verify slot re-appears in availability.

### Phase 7 — LLM Provider Chaos

38. **Primary-provider timeout**: configure OpenAI with an unreachable endpoint. Issue Studio generate. Verify fallback to Anthropic fires. Verify response still completes.
39. **All providers down**: configure all three with unreachable endpoints. Issue Studio generate. Verify graceful failure with a user-visible "AI is unavailable right now" message. Verify no partial page was persisted.
40. **Rate-limit from provider**: mock OpenAI returning 429. Verify backoff + retry logic. Verify no request storm (exponential backoff respected).
41. **Malformed structured output**: mock provider returning JSON that fails Pydantic validation. Verify single retry with validation error appended. Verify graceful failure after second attempt.
42. **Slow provider**: mock provider responding at 5s/token (incredibly slow). Verify the 45s wall-time budget fires and truncates, returning partial output if possible.
43. **Partial stream failure**: stream opens, sends some chunks, then the connection drops. Verify the graph engine catches the error, persists any partial result if the SSE `compose.complete` fired, else fails cleanly.

### Phase 8 — Exhaustive RLS Audit

44. Create `tests/security/rls_audit.py` — the comprehensive cross-tenant isolation verifier. For every tenant-scoped table:
    - Connect as `forge_app` (no BYPASSRLS).
    - Set context to org A.
    - INSERT one row.
    - Set context to org B.
    - Attempt SELECT → must return 0 rows of A's data.
    - Attempt UPDATE → must affect 0 rows of A's data.
    - Attempt DELETE → must affect 0 rows of A's data.
    - Attempt INSERT with `organization_id = A's id` while context is B → must raise `WITH CHECK` violation.
    - Reset context; verify rows still exist and are visible to A.
45. Run for every table in the RLS-protected list from BI-01 — no exceptions. The test iterates the list from the shared schema module so new tables are automatically covered (if they're registered). Unregistered tables fail the test.
46. Audit view/materialized-view access: verify views respect RLS of their underlying tables, or are explicitly marked `SECURITY INVOKER` / `SECURITY DEFINER` with documentation of why.
47. Audit worker-job access: worker jobs run `SET LOCAL app.current_org_id` before DB operations; the test verifies that worker code paths with missing context fail closed (0 rows) rather than leaking.

### Phase 9 — Data Export & Import Verification

48. For every user-facing export (submissions CSV, analytics CSV, full org export, signed proposal PDF):
    - Create known data.
    - Export.
    - Parse the export.
    - Verify field-by-field match.
    - Verify no cross-tenant data in the export.
    - Verify proper encoding (UTF-8, correct escaping for CSV).
49. Test the full-org export → delete org → (in a fresh setup) run a conceptual "import" from the export verifying data fidelity. We don't ship an import feature, but this proves the export contains what's claimed — important for customer trust and compliance.
50. Test signed-PDF integrity: acceptance → regenerate PDF → byte-identical (or deterministic diff) as the original. Critical for legal durability.

### Phase 10 — Accessibility Automated Suite

51. Playwright + `@axe-core/playwright` audit on every page route:
    - Marketing /, /pricing, /templates, /workflows/*, /signin, /signup.
    - App (authenticated): /dashboard, /studio, /pages/[id]/*, /analytics, /settings/*.
    - Admin (privileged): /admin/*.
    - Public pages: /p/[org]/[page] for each workflow variant.
52. Every route must have zero axe-core violations of severity "serious" or higher. Minor violations (best-practice) allowed with documentation.
53. Keyboard navigation test: for each route, tab through every focusable element. Assert focus order is logical, no focus traps (except explicit modals), focus indicators are visible.
54. Screen-reader announcement test: use `page.accessibility.snapshot()` to verify the ARIA tree for each major surface matches a committed snapshot.

### Phase 11 — Performance Regression Suite

55. Lighthouse CI runs on every PR against the 8 critical routes. Targets codified in `lighthouserc.json`. Any regression > 5 points on any metric blocks merge.
56. Bundle size check: `pnpm build` measures per-route JS bundle sizes; compare against committed budgets in `apps/web/.size-limit.json`. Regression > 10% blocks merge.
57. DB query performance: for a corpus of representative queries (list pages, submissions with filters, funnel compute, analytics summary), capture EXPLAIN ANALYZE plans and compare against committed baselines. Plan changes require explicit review.

### Phase 12 — Contract Tests (Frontend ↔ Backend)

58. The OpenAPI → TypeScript type generation from BI-02 catches most drift. Extend with runtime contract tests:
    - For every frontend hook that hits an API endpoint, run a test that seeds the expected response in a mock server and asserts the parsed response satisfies the frontend type (deep-equal after normalization).
    - Reverse: for every Pydantic model, a test in the API checks that the example payload in the OpenAPI spec round-trips through the Pydantic model.
59. Spec freshness: CI detects when the committed `apps/web/src/lib/api/schema.ts` doesn't match the live OpenAPI spec produced by the API. Fails CI; author must regen.

### Phase 13 — Visual Regression

60. Playwright screenshot comparisons for the 30 most design-critical surfaces:
    - Every major app route in light and dark mode.
    - Each component catalog entry (hero_full_bleed, form_stacked, etc.) rendered in isolation.
    - Each composer's exemplar output from O-03's fixtures, rendered on a neutral page.
    - Each email template (notify_owner, confirm_submitter, invitation, proposal_accepted, etc.) rendered with test data.
61. Tolerance: pixel diff ≤ 0.1%. Drift > threshold blocks merge; reviewer decides if the change is intentional (update snapshot) or a bug (fix).

### Phase 14 — Test Data Management

62. Fixtures under `apps/api/tests/fixtures/` are the source of truth for test data shapes:
    - `orgs.json` — realistic org shapes (a contractor, a restaurant, a consultant, a SaaS, a nonprofit).
    - `submissions.json` — varied submission shapes.
    - `proposals.json` — realistic proposal drafts.
    - `decks.json` — realistic deck outlines.
    - `llm_responses.json` — canned LLM responses for deterministic composer testing.
63. A `seed_test_corpus.py` CLI populates any test environment with a realistic dataset — 50 orgs, 500 users, 2000 pages, 20000 submissions, 100000 analytics events. Used for manual QA and load-test baseline data.

### Phase 15 — Final Gate: The Green Run

64. Before declaring this mission done, a full E2E CI run completes green:
    - All unit tests (API, Web, Worker) pass.
    - All Playwright E2E journeys pass across all browsers.
    - Security scan has zero HIGH findings.
    - Load-test thresholds (p95 < 500ms for public form submit, etc.) met.
    - Accessibility suite has zero serious violations.
    - Lighthouse scores at or above documented targets.
    - RLS audit clean across every table.
    - Contract tests pass.
    - Visual regressions zero.
65. The green run is bookmarked as the "go-live green" build. Its commit SHA becomes the candidate to deploy in GL-04.

### Phase 16 — Documentation

66. `docs/testing/E2E_GUIDE.md` — how to write a new Playwright test, how to debug failures, how to interpret trace files.
67. `docs/testing/LOAD_GUIDE.md` — how to interpret k6 results, how to add a new scenario, how to set thresholds.
68. `docs/testing/SECURITY_GUIDE.md` — the security probe catalog, how to add new probes when new surfaces ship.
69. `docs/testing/RLS_AUDIT.md` — the audit tool and how to extend it when new tables are added.
70. Mission report.

---

## Acceptance Criteria

- Playwright E2E suite covers every critical user journey across all three workflows, team flow, billing, quota, settings, and admin.
- Every error path produces a user-friendly message and is tested.
- k6 load suites run in CI with documented thresholds; baseline benchmarks committed.
- OWASP ZAP baseline scan runs weekly with zero HIGH-severity findings.
- Hand-written security probes cover SQLi, XSS, CSRF, IDOR, path traversal, auth bypass, and more — all pass.
- Webhook replay tests cover the full Stripe, Resend, and Google Calendar event sets including idempotency.
- Calendar edge cases (DST, recurrence, race conditions) are tested.
- LLM chaos tests verify fallback, retry, and graceful degradation.
- Exhaustive RLS audit confirms tenant isolation across every table, every query shape.
- Data export integrity verified for every export.
- Accessibility suite zero serious violations on every route.
- Lighthouse regression suite passes with committed baselines.
- Contract tests verify frontend ↔ backend type compatibility.
- Visual regression tests pass for all 30+ design-critical surfaces.
- The "go-live green" candidate build is identified.
- All testing documentation written.
- Mission report complete.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
