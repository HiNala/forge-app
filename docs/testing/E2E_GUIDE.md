# End-to-end testing (GL-03)

## Layout

- Playwright specs live under `apps/web/e2e/`.
- Shared helpers live under `apps/web/tests/e2e/helpers/` (importable from specs).
- CI runs against **docker-compose.ci** with `PLAYWRIGHT_EXTERNAL_APP=1` so Playwright does not start its own Next.js server.

## Commands

```bash
cd apps/web
pnpm exec playwright test
```

- **Chromium only (default):** omit `PLAYWRIGHT_FULL_MATRIX`.
- **Firefox, WebKit, Pixel 8, iPhone 15:** `PLAYWRIGHT_FULL_MATRIX=1 pnpm exec playwright test` (Windows: set env in System or use Git Bash).

## Environment

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_BASE_URL` | Web origin (default `http://127.0.0.1:3000`). |
| `PLAYWRIGHT_EXTERNAL_APP` | `1` = skip Playwright `webServer` (use Docker stack). |
| `PLAYWRIGHT_API_URL` | API origin for helpers (default derived from `NEXT_PUBLIC_API_URL` or `http://127.0.0.1:8000`). |
| `FORGE_E2E_TOKEN` | Must match API `FORGE_E2E_TOKEN` for `createTestOrg()` helper. |
| `PLAYWRIGHT_NEXT_DEV` | `1` = run `next dev` instead of `next start` (local axe on `/dev/*`). |

## Seeding

`POST /api/v1/__e2e__/seed-org` with header `X-Forge-E2e-Token` creates a fresh user + workspace when `FORGE_E2E_TOKEN` is set on the API. The API compares tokens in constant time (see `app.core.secret_compare`). Never set `FORGE_E2E_TOKEN` in production.

## Debugging failures

CI uploads **playwright-report** and **test-results** (traces, screenshots) for 30 days on failure. Open HTML report locally: `pnpm exec playwright show-report`.

Use `trace: 'on-first-retry'` locally or `retain-on-failure` in CI (see `playwright.config.ts`).
