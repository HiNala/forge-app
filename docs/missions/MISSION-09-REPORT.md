# Mission 09 — Template library (report)

**Branch:** `mission-09-templates`  
**Status:** Core product work was largely present in-repo; this pass **aligns analytics naming**, **improves marketing/sign-in deep links**, **tightens API typing**, and **documents** the feature.

## Verified in codebase

| Requirement | Implementation |
|---------------|------------------|
| `templates` table + slug | `app/db/models/template.py` — slug, html, form_schema, intent_json, is_published, sort_order, preview_image_url, etc. |
| `GET /api/v1/templates` (auth, filter, search) | `app/api/v1/templates.py` |
| `GET /api/v1/templates/{id}` | Same; returns `TemplateDetailOut` (fixed response model). |
| `POST /api/v1/templates/{id}/use` | Clones page, `PageRevision.edit_type=template_applied`, welcome `Message`, brand via `finalize_template_html` / `brand_kit_snapshot_dict`. |
| Admin CRUD + from-page + regenerate preview | `app/api/v1/admin.py` + `require_forge_operator`; worker job `generate_template_preview` in `apps/worker/worker.py`. |
| Public previews | `GET /api/v1/public/templates/slugs`, `by-slug/{slug}`; marketing `(marketing)/examples/[slug]` with `generateStaticParams`, JSON-LD, OG. |
| Signup deep link `?template=` | `signup-client.tsx` + `signup/continue` + `postTemplateUse`. |
| 24+ curated seeds | `app/seed_templates_data.py` — **32** templates across categories; `scripts/seed_templates.py` idempotent upsert (+ optional YAML fixtures). |
| Gallery UI | `(app)/templates/page.tsx` — grid, category chips, search, modal, preview live. |
| Studio path | `Browse templates →` → `/templates`. |
| Marketing highlights | `GallerySection` + `TEMPLATE_CARDS` (6 cards) on homepage; links to `/examples` and **sign-in → `/templates`**. |
| Tests | `tests/test_templates_mission09.py` — unpublished hidden, use flow, admin gate, public slug; **asserts `template_used` analytics**. |

## Changes in this mission pass

- **`template_used`** — `AnalyticsEvent` + PostHog `capture` now use `template_used` with `user_id` / `org_id` in metadata; admin stats aggregate **`template_used` and legacy `template_use_click`**.
- **Analytics catalog** — `app/services/analytics/events.py` documents `template_used`.
- **`get_template`** — return type `TemplateDetailOut` + `model_validate` for OpenAPI/clients.
- **Marketing** — gallery copy + “Open full gallery in the app” → `/signin?redirect_url=/templates`.
- **Sign-in** — `redirect_url` query param (same-origin path only) passed to Clerk `forceRedirectUrl`.

## Operator / QA checklist (manual)

- [ ] Run `uv run python scripts/seed_templates.py` in each environment that should show templates.
- [ ] Run worker with Redis so **Regenerate preview** jobs complete; verify `preview_image_url` on rows.
- [ ] Lighthouse / a11y spot-check on several `/examples/{slug}` pages (Mission 09 §10).
- [ ] Confirm `POSTHOG_API_KEY` in prod if internal `template_used` funnels matter.

## Deferred (out of scope or follow-up)

- **Admin UI** full CRUD in-browser (create/edit/reorder) — partial; admin list + regenerate exists; heavy editing via API/seed.
- **Conversion dashboards** (use → publish, avg refinements) — needs BI on `template_used` + publish events.
- **AI-suggested template** near prompt — roadmap.
- **Playwright screenshot test in CI** — optional; worker path is environment-dependent.

## References

- `docs/plan/02_PRD.md` (templates post-launch)
- `apps/api/scripts/seed_templates.py`
- `apps/web/src/app/(marketing)/examples/[slug]/page.tsx`
