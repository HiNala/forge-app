# Lighthouse (Mission FE-07)

Targets from the PRD (authenticated app): mobile ≥ 85, desktop ≥ 95; marketing: mobile ≥ 95, desktop ≥ 98; published pages ≥ 95 mobile.

## How to run locally

From `apps/web`:

```bash
pnpm run build
pnpm run start
```

In another terminal, run Lighthouse against your base URL (replace port as needed):

```bash
npx lighthouse http://localhost:3000/dashboard --only-categories=performance,accessibility,best-practices,seo --view
```

Repeat for each route (`/`, `/studio`, `/settings/profile`, `/analytics`, etc.). Document scores and the Lighthouse version in this file when you complete a release QA pass.

## Notes

- First load after `start` is cold; use a second run for stable numbers.
- Authenticated routes require a session — use a logged-in browser profile or manual navigation before auditing.
