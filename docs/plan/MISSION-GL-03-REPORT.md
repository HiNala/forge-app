# Mission GL-03 — Integration testing, load & coverage (report)

**Branch:** `mission-gl-03-integration-testing`  
**Status:** Foundation delivered; many checklist items are **incremental** and tracked below.

## Delivered in this pass

1. **Playwright**
   - Multi-browser + mobile projects when `PLAYWRIGHT_FULL_MATRIX=1`; default local run uses **Chromium only** for speed.
   - `PLAYWRIGHT_EXTERNAL_APP` skips embedded `webServer` for docker-compose.ci runs.
   - Helpers under `apps/web/tests/e2e/helpers/` (`createTestOrg`, Mailpit reader, page factory, queue/LLM hooks).
   - `e2e/ci-stack-smoke.spec.ts` for stack validation + optional seed API test when `FORGE_E2E_TOKEN` is set.

2. **E2E seed API**
   - `POST /api/v1/__e2e__/seed-org` gated by `FORGE_E2E_TOKEN` (404 when unset or wrong token).
   - `docker-compose.ci.yml` sets `AUTH_TEST_BYPASS`, `ENVIRONMENT=test`, and `FORGE_E2E_TOKEN` for CI.

3. **CI**
   - `.github/workflows/e2e.yml` — builds stack, waits for health, runs Playwright smoke (`chromium`, `ci-stack-smoke`).

4. **k6**
   - `load/scenarios/public_form_submit.js`, `analytics_burst.js`, `load/README.md`.

5. **Security**
   - `apps/api/tests/security/test_malicious_public_submit.py` baseline probes.
   - `.github/workflows/security-zap.yml` weekly ZAP placeholder (tune target + auth before gating).

6. **RLS**
   - `scripts/rls_cross_tenant_audit.py` (wraps `check-rls.py`; deep cross-tenant matrix documented in `docs/testing/RLS_AUDIT.md`).

7. **Webhooks**
   - `apps/api/tests/webhooks/test_stripe_replay.py` skipped scaffolds for Stripe replay expansion.

8. **Docs**
   - `docs/testing/E2E_GUIDE.md`, `LOAD_GUIDE.md`, `SECURITY_GUIDE.md`, `RLS_AUDIT.md`, `docs/benchmarks/BASELINES.md`.

9. **Fixtures / tooling**
   - `apps/api/tests/fixtures/orgs.json` sample shapes.
   - `scripts/seed_test_corpus.py` placeholder.
   - `scripts/ci/wait-for-stack.sh`.

## Remaining (not automated end-to-end in this PR)

Golden-path Playwright journeys (contact form + booking, proposal, pitch deck, team invite + Mailpit, Stripe checkout, quota 402, admin impersonation, etc.) require stable **test credentials**, **Stripe test mode**, and **time** — implement incrementally using helpers and tagged specs.

Similarly: full k6 nightly regression vs 7-day baseline, ZAP authenticated scan with zero HIGH, exhaustive RLS INSERT/UPDATE matrix, LLM chaos suite, calendar DST/recurrence tests, visual regression baselines, Lighthouse CI, bundle size gates, OpenAPI drift CI, and axe on every route — each is a follow-on milestone building on this infrastructure.

## Green run criteria (mission §65)

Execute when staging + secrets are available: full unit + API tests, Playwright matrix, ZAP policy, k6 thresholds, RLS deep audit, contract/visual/a11y gates — then record the **go-live SHA** in this doc and `docs/benchmarks/BASELINES.md`.
