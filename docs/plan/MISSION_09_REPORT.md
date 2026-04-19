# Mission 09 — Template Library (report)

## Summary

Mission 09 adds a **curated global template library**: API routes to list/browse/use templates, admin CRUD for operator orgs, public marketing previews at `/examples/{slug}`, an authenticated gallery at `/templates`, Playwright-based preview generation in the worker, PostHog `template_used` capture, and **32 seed templates** in `app/seed_templates_data.py` (idempotent `scripts/seed_templates.py`).

## What shipped in-repo

| Area | Notes |
|------|--------|
| **DB** | Alembic `c9d0e1f2a3b4` — `templates.slug` unique (preview URLs + gallery). |
| **API** | `GET/PATCH/POST/DELETE /api/v1/admin/templates*`, `GET /api/v1/templates`, `GET /api/v1/templates/{id}`, `POST /api/v1/templates/{id}/use`, `GET /api/v1/public/templates/slugs`, `GET /api/v1/public/templates/by-slug/{slug}`, `GET /api/v1/admin/templates/stats`. |
| **Use flow** | Creates `Page` + `PageRevision` (`edit_type=template_applied`) + `Conversation` with assistant welcome + `analytics_events` (`template_used`) + PostHog capture. |
| **Worker** | `generate_template_preview` (Playwright → S3); restored `purge_deleted_user` stub + `enqueue_purge_deleted_user` in `queue.py`. |
| **Web** | Gallery UI, marketing examples + homepage cards (real slugs), `/examples/[slug]` with SEO + JSON-LD, signup `?template=` → `postTemplateUse` after `postSignup`, `(app)/admin/templates` (env-gated). |
| **Tests** | `tests/test_templates_mission09.py` (Postgres). |

## Operator / admin gating

- **API**: existing `require_forge_operator` + `FORGE_OPERATOR_ORG_IDS`.
- **Web admin UI**: `NEXT_PUBLIC_FORGE_OPERATOR_ORG_IDS` must list the same org UUID(s) as the server allowlist.

## Seed data

```bash
cd apps/api && uv run alembic upgrade head
cd apps/api && uv run python scripts/seed_templates.py
```

Preview images populate when the worker runs `generate_template_preview` (after admin create/update or “Regenerate preview”).

## Deferred / production follow-ups

- **Lighthouse / WCAG proof** on all 32 templates (manual QA checklist in mission doc).
- **Admin “create from page”** is implemented on the API (`POST /admin/templates/from-page`); no full form UI in the web admin page yet (list + regenerate only).
- **Marketing homepage** could add more prominent “Browse templates” above the fold; gallery section links to sign-in → `/templates`.
- **CI**: ensure Postgres + migrations for integration tests; full `pytest` may include unrelated user-flow failures depending on DB state—run `pytest tests/test_templates_mission09.py` for Mission 09 coverage.

## Post-launch cadence

1. Run seed in staging/prod after deploy.  
2. Queue preview regeneration once worker + S3/R2 are healthy.  
3. Watch `GET /admin/templates/stats` and PostHog for `template_used`.  
4. Retire low performers by setting `is_published=false`.
