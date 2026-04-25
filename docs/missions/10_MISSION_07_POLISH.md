# MISSION 07 — Polish & Production Readiness

**Goal:** Everything built in Missions 00 through 06 gets a full sweep. Every PRD requirement is re-checked. Every piece of integrated design work from the designer Claude is slotted in. Every test suite goes green. Every lint warning is fixed. Every `TODO` and `FIXME` in the codebase is resolved or tracked. Accessibility is measured and fixed to WCAG AA. Performance is measured and tuned. Security is audited. After this mission, Forge is a product that can survive contact with the public.

**Branch:** `mission-07-polish`
**Prerequisites:** Missions 00–06 complete. Designer's final work available as design tokens + Figma/HTML reference.
**Estimated scope:** Touches every file. The biggest single mission by breadth, but no new features — only correctness and quality.

---

## How To Run This Mission

Do NOT treat this as "fix what's obvious." Go through the PRD section by section. For each requirement, verify it's implemented with a test. For each mission report, verify the acceptance criteria actually hold. If anything is missing or half-done, finish it properly — do not defer it to a post-launch backlog.

The discipline for this mission is boring. It's reading code you already wrote and making it better. That is the work. Every improvement commit should describe what was improved and why. No "polish" commits. Be specific: `fix(studio): debounce preview update to prevent flicker`, `perf(api): add composite index on submissions(organization_id, page_id, created_at)`, `a11y(dashboard): add keyboard nav to page grid`.

Commit on each of these sweeps: PRD compliance, design integration, lint/type/test green, performance, accessibility, security, documentation.

**Do not stop until every item is verified complete. Do not stop until every item is verified complete. Do not stop until every item is verified complete.**

---

## TODO List

### Phase 1 — PRD Compliance Sweep

1. Re-read `02_PRD.md` front to back. Make a checklist of every requirement.
2. For each requirement in §3 (Scope), verify the feature exists, works, and is tested. Fix anything that regressed.
3. For each invariant in §8, write or verify a test that enforces it.
4. For each env var in §9, verify it's documented in `.env.example`, read correctly in `config.py`, and fails cleanly if missing.
5. For each performance target in §10, write a benchmark and verify it passes. Add performance regression tests to CI.
6. For each security item in §11, verify implementation. Document in `docs/security/IMPLEMENTATION.md`.
7. Re-read every mission report. For every "deferred" item marked during a mission, decide: implement now, or re-scope and document in the backlog.

### Phase 2 — Design Integration

8. Pull the designer's final design tokens into `apps/web/src/styles/tokens.css`. Replace the placeholder values with real ones.
9. Update `tailwind.config.ts` to reference these tokens.
10. Audit every screen for design compliance. The designer's visual treatment should be present in: sign-in, onboarding, dashboard, Studio empty + active, Page Detail (all tabs), Settings (all sub-views), public pages, marketing pages.
11. Integrate the designer's component library into `apps/web/src/components/ui/`. Replace shadcn defaults with the designer's versions where they exist.
12. Update the Page Composer's HTML component library in `apps/api/app/services/orchestration/components/` to match the designer's templates. Generated pages should now look like real Forge output.
13. Run a visual diff: pick 5 representative screens, screenshot before and after design integration. Confirm alignment with the designer's reference.

### Phase 3 — Lint, Typecheck, Test Green

14. Run `pnpm lint --fix` across the frontend. Manually fix anything the auto-fixer can't resolve. No warnings in CI.
15. Run `uv run ruff check --fix` across the backend. Same rule.
16. Run `uv run mypy app --strict` and fix every error. `strict` mode for mypy is mandatory.
17. Run `pnpm typecheck` with `strict: true` in tsconfig. Fix every error.
18. Run the full test suite (unit, integration, e2e). Fix any flaky tests. Add tests for any gap surfaced.
19. Add coverage reporting. Target ≥ 80% line coverage for services layer, ≥ 60% overall.
20. Every async function has a type-hinted return. Every Pydantic model has example fields populated.

### Phase 4 — Performance Pass

21. Profile Studio generation end-to-end. Measure each pipeline stage (intent, compose, validate, persist). Identify the slowest and optimize.
22. Profile submission endpoint. Should be < 200ms p50. If slower, find the bottleneck (likely analytics insertion — consider batching).
23. Add missing DB indexes. Run `EXPLAIN ANALYZE` on every list-endpoint query. Fix any sequential scans on tables > 10k rows.
24. Audit N+1 query patterns in SQLAlchemy. Use `selectinload` / `joinedload` appropriately.
25. Measure Lighthouse scores on published pages. Every page type must hit ≥ 95 on mobile performance. Fix render-blocking resources, unused CSS, inefficient images.
26. Measure the authenticated app's Lighthouse. Target ≥ 85 on mobile performance for Dashboard, Studio, Page Detail.
27. Audit the frontend bundle size. Split by route. Any route > 300KB gzipped gets a code-split pass.
28. Redis cache hit rates: measure and tune TTLs. Aim for > 80% hits on page summary and > 95% on public page HTML.

### Phase 5 — Accessibility (WCAG AA)

29. Run axe-core on every authenticated screen. Fix every violation.
30. Run axe-core on every public generated page template. Fix every violation in the component library.
31. Every interactive element has visible focus state and keyboard activation.
32. Tab order is logical on every screen.
33. Color contrast meets 4.5:1 for text, 3:1 for UI components. Fix any failures against the design token palette.
34. All form fields have associated labels. Error messages use `aria-live` regions.
35. Studio's section-click editing works with keyboard: Tab to enter edit mode, arrow keys to cycle sections, Enter to open the edit popup.
36. Screen reader test the critical flows: signup, create page, submit on a public page.

### Phase 6 — Security Review

37. Run `pip-audit` and `pnpm audit`. Fix every critical or high vulnerability.
38. Verify HTTPS everywhere. No HTTP fallbacks.
39. Verify all cookies are `HttpOnly; Secure; SameSite=Lax`. Session cookies are not readable from JS.
40. Verify CSP headers on public pages. Test that injection attempts (e.g., a submission payload with `<script>` in a text field) cannot execute in the admin view — the admin view renders submissions as text, never as HTML.
41. Verify file upload paths: no path traversal, MIME-type sniff matches declared type, max size enforced at three layers (frontend validation, presigned URL constraint, backend post-validation).
42. Verify rate limits are enforced on every public endpoint.
43. Verify RLS is active on every tenant table (re-run the CI check from Mission 02).
44. Run a penetration smoke test: attempt cross-tenant reads, IDOR on submission IDs, JWT tampering, webhook forgery without signature, uploading a `.exe` renamed to `.png`. All should fail.
45. Secrets audit: no secrets in git history, no secrets in logs, no secrets in Sentry events. Enable GitHub's Secret Scanning.
46. Enable Dependabot for both `apps/web` (npm) and `apps/api` (uv).

### Phase 7 — Observability & Error Handling

47. Every endpoint has structured logging at INFO level for entry/exit with duration.
48. Every background job logs structured start/end with job_id and duration.
49. Sentry captures every unhandled exception. Add context (user_id, org_id, route) via `before_send` scrubbing.
50. Frontend error boundary catches React render errors, sends to Sentry, shows a friendly fallback.
51. Add health check endpoints that validate downstream connectivity: `GET /health/deep` checks postgres, redis, S3, Resend, Stripe, OpenAI API.
52. Add `GET /metrics` (Prometheus format) if deploying to Railway with their Prometheus addon, or equivalent custom endpoint.

### Phase 8 — Error UX

53. Every error path has a considered UI: network errors, validation errors, quota errors, 404s, 500s.
54. 500s never leak stack traces to users in production — they show a generic "Something went wrong, we're looking into it" with a Sentry error ID.
55. Empty states are present for every list view: "No pages yet," "No submissions yet," "No team members yet." Each has a clear CTA.
56. Loading states use skeletons matched to the expected content's shape, not generic spinners.

### Phase 9 — Copy & Content Review

57. Every user-facing string in the authenticated app goes through a copy audit. Is it clear? Kind? Does it set correct expectations? The principle: copy should sound like Lucy's coworker, not like a lawyer or a marketing department.
58. Error messages are actionable: "Slug must be unique in your workspace. Try `small-jobs-v2`" not "Slug validation failed."
59. Email templates are reviewed and tested in real email clients (Gmail, Outlook, Apple Mail).
60. Marketing page copy is reviewed for conversion intent — each section answers a specific prospect question.

### Phase 10 — Documentation Sweep

61. Every service class has a docstring explaining its responsibility.
62. Every public API endpoint has a full OpenAPI description, not a one-line summary.
63. Update `README.md` with the final flow: clone → docker compose up → sign up → create a page.
64. Write `docs/runbooks/INCIDENT_RESPONSE.md` covering: how to check if production is healthy, how to roll back a bad deploy, how to access logs, how to pause sends if Resend is compromised.
65. Write `docs/architecture/SYSTEM_OVERVIEW.md` — a final architecture diagram (mermaid or PNG) showing the full request path.
66. Every mission report references the subsequent mission's prerequisites so future maintenance can navigate.
67. Mission 07 report lists every issue found in the sweep and whether it was fixed or filed for the backlog.

---

## Acceptance Criteria

- Every PRD requirement has a test that enforces it.
- Every mission's acceptance criteria still hold.
- `pnpm lint`, `pnpm typecheck`, `uv run ruff check`, `uv run mypy --strict`, and the full test suite all pass with zero warnings.
- Coverage ≥ 80% in services layer.
- Lighthouse ≥ 95 mobile on published pages; ≥ 85 in the authenticated app.
- WCAG AA on every screen, verified by axe-core with zero violations.
- No critical or high vulnerabilities in dependency audits.
- No secrets in git history. Dependabot enabled.
- Designer's final design integrated across the product.
- All TODOs in the codebase are resolved or tracked in an issue.
- Mission report lists what was found and what was fixed.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
