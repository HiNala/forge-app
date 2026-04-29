# MISSION AL-01 — Public reliability & security ops (partial landing)

Delivered vs **full charter**: this drop focuses on audit **P0 URL construction**, Analytics client URL bug, re-export parity tests, and documentation stubs. Operational items that require staging access (backup drill timings, pasted `/health/deep` output, checklist signatures) remain **explicitly manual**.

## P0 resolved in code

| Finding | Resolution |
|---------|---------------|
| Public API URL duplication risk | **`normalizeApiOrigin()`** strips trailing `/api/v1` case-insensitively; **`getAnalyticsTrackUrl()`** centralizes ingest path. **`useAnalytics`** no longer appends `/api/v1` twice. Tests: `api-url.test.ts`, `api.test.ts`. |
| Public shell fetch | **`p/[org]/[slug]/page.tsx`** already used **`getPublicPageApiUrl`**; remains correct with normalized env. |

## Re-exports

- **`@/lib/api`** exports `getApiUrl`, `getPublicPageApiUrl`, `getAnalyticsTrackUrl`, `normalizeApiOrigin` alongside existing client.

## Threat model docs

- `docs/architecture/PUBLIC_PAGE_SECURITY.md` — iframe + CSP layering.
- `docs/runbooks/PUBLIC_PAGE_SERVING.md` — DNS/TLS troubleshooting.
- `docs/runbooks/COST_ALERT_PLAYBOOK.md`, `docs/runbooks/STRIPE_DISPUTE.md` — short operational entry points.

## Already present (verified)

- **API**: `/health/live`, `/health/ready`, `/health/deep`, gated `/metrics` (`apps/api/app/main.py`, `apps/api/app/core/health_checks.py`).
- **Production config gates**: `_require_secret_in_production` in `apps/api/app/config.py` (stripe live, METRICS_TOKEN length, TRUSTED_HOSTS≠*, localhost DB guard, …).
- **`scripts/deployment/audit_env.sh`** exists for Railway parity checks.

## Follow-up in this session

- **`AppRouteAnalytics`** — `useAnalytics()` mounted in signed-in **`AppShell`** (`app-route-analytics.tsx` + `app-shell.tsx`) so analytics POSTs use **`getAnalyticsTrackUrl()`**.
- **`e2e/public-page-route.spec.ts`** — smoke that `/p/...` missing slug does not 5xx.
- **`@forge/types` typecheck** — uses `apps/web`’s TypeScript `tsc` via `packages/types/package.json` (fixes missing local `typescript` binary on constrained installs).

## Outstanding (human / scheduled)

- Signed **`docs/LAUNCH_CHECKLIST.md`** rows with screenshots.
- **`audit_env.sh --strict`** in CI verified against Railway `production`.
- Full HTML tree sanitizer expansion + CSP hash automation (see audit Phase 2).
- Staging **`pnpm test:e2e`** matrix with both `NEXT_PUBLIC_API_URL` forms (unit tests substitute).
- Backup-restore timed drill appended to **`docs/runbooks/DISASTER_RECOVERY.md`**.

## Verification commands

```bash
cd apps/web && pnpm vitest run src/lib/api-url.test.ts src/lib/api.test.ts
pnpm --filter @forge/types typecheck
cd apps/web && pnpm exec tsc --noEmit
cd apps/api && python -m pytest tests/security/ -q   # optional full suite
```