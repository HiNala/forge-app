# Public page serving — DNS & TLS

**Last verified:** 2026-04-28  

## Purpose

Forge serves published mini-apps under `/p/[orgSlug]/[pageSlug]` (Next.js) fetching HTML from **`GET /api/v1/public/pages/{org}/{slug}`**. Custom domains terminate TLS upstream (Railway/Caddy/on-demand TLS) before traffic reaches the Forge web app.

## Symptom

Page 404 despite “Published” status, or stale HTML.

## Likely causes

| Cause | Indicator |
|--------|-----------|
| Wrong **`NEXT_PUBLIC_API_URL`** duplicate prefix (`.../api/v1/api/v1/...`) | API logs 404 double path; verify `normalizeApiOrigin`/`getPublicPageApiUrl` (AL-01). |
| API not reachable from web SSR | SSR fetch timeouts; DNS / TLS / env mismatch |
| CDN cache | Old response body |

## Diagnostics

1. `curl -sS "$(API)/api/v1/public/pages/org/slug" | jq .title` — confirms API payload.
2. `curl -I "https://forge.app/p/org/slug"` — 200 + HTML shell (iframe wrapper).
3. Compare `NEXT_PUBLIC_API_URL` between local and production docs (bare host vs `.../api/v1`).

## Resolution playbook

1. Fix env vars so `NEXT_PUBLIC_API_URL` is either bare API origin **or** full `.../api/v1`; never concatenate `/api/v1` manually outside `api-url.ts`.
2. Redeploy web after changing public env vars.
3. Invalidate edge cache if applicable.

## Escalation

On-call engineer → platform infra if TLS/DNS regressions persist.
