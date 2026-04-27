# Mission P-06 — Template & workflow suite (report)

**Branch:** `mission-v2-p06-template-suite`  
**Goal:** Expand Forge’s page-backed workflows and Studio empty state so a wide range of “quick page” jobs route through one system — with composers, landings, templates, and surface config.

## Shipped in this pass

1. **Workflow model**
   - New `WorkflowPlanType` / `PageType` values: `survey`, `quiz`, `coming_soon`, `resume`, and first-class `gallery` (`gallery` no longer maps to `custom` in the intent normalizer).
   - Planners: `plan_survey`, `plan_quiz`, `plan_coming_soon`, `plan_resume`, `plan_gallery_page`; gallery no longer reuses the generic landing planner.
   - Composers + prompts: `LinkInBioComposer`, `SurveyComposer`, `QuizComposer`, `ComingSoonComposer`, `ResumeComposer` (with `link_in_bio`, `survey`, `quiz`, `coming_soon`, `resume` prompt files). Existing menu / RSVP / gallery composers remain.
2. **Orchestration**
   - `forced_workflow` is applied in `stream_page_generation` after intent parse; `StudioGenerateRequest.forced_workflow` widened to `str`.
   - Studio grid primes prompts and sets `forced_workflow` on first generate; URL `?workflow=` is applied once.
3. **Component library**
   - Large catalog addition for P-06 block names (link-in-bio, survey, quiz, coming-soon, gallery, resume, event, menu extras) plus Jinja for `link_in_bio_avatar_block` and `link_in_bio_link_card` (with analytics hook data attributes).
4. **Product registry**
   - `app/services/workflows/registry.py` — `WORKFLOW_REGISTRY` and helpers for display metadata and Studio paths.
5. **Web**
   - `StudioWorkflowGrid` (4×4, four category rows) replaces the small starter card grid.
   - `workflow-landings.ts` — 15 slugs including `web-page` and the eight new marketing pages; `/workflows` index + nav link.
   - `getWorkflowSurfaceConfig` extended for new `page_type`s.
6. **Templates**
   - ~62 curated rows in `seed_templates_data.py` with distinct `page_type` hints; list API returns `page_type` from `intent_json`.
   - In-app `/templates` adds **workflow group** chips aligned with the Studio grid rows (filter by `page_type`).
7. **Analytics**
   - `events.py`: `link_click`, `menu_item_view`, `rsvp_submit`, `survey_step_complete`, `quiz_complete`.
   - Alembic `p06b_analytics_workflow_events` refreshes `ck_analytics_events_event_type` from the live `EVENTS` map.
   - `public/forge-track.js` sends `link_click` (with `page_id`, `url`, `link_label`) when `data-forge-analytics` is set — used by `link_in_bio_link_card`.
8. **Page Detail**
   - First tab label **Overview** (was Share); link-in-bio third tab **Links** via `getWorkflowSurfaceConfig`.
9. **Docs & tests**
   - `docs/architecture/WORKFLOW_FRAMEWORK.md` updated; `test_p06_workflow_surface.py`, `test_p06_planner_evaluation.py` (32 planner cases), `test_seed_templates_p06.py`.
   - `e2e/p06-workflow-marketing.spec.ts` — public `/workflows/*` landings for the eight new slugs.

## Intentional deferrals (follow-up)

- **DB CHECK** on `pages.page_type` — `p06_page_type_check` (revises `p05_canvas_orch`). Ensure no legacy rows violate the allowed set before migrating production.
- **Page Detail** interactive surfaces (Link CRUD/reorder UI, survey branching editor, etc.) remain future work; routing still uses Share/Submissions/Automations/Export/Analytics with workflow-specific **labels** only.
- **LLM composer contract tests** (structured output assertions against real model responses) are not in this repo pass — deterministic **planner** evaluation covers structure.
- **Authenticated Studio → publish → public submit** Playwright paths still need Clerk + API harness.
- **Mailchimp / Printful** integrations for coming-soon / gallery are **not** implemented; prompts and registry leave room.

## Verification

- `python -m pytest tests/test_p06_workflow_surface.py tests/test_p06_planner_evaluation.py tests/test_seed_templates_p06.py` — pass.
- `pnpm exec tsc --noEmit` (apps/web) — pass.
- `pnpm run lint:strict` + `pnpm run build` (apps/web) — pass (Next may print existing middleware/edge warnings).
- Public tracker: `data-forge-analytics` values are allow-listed client-side to match the API event taxonomy (invalid values are ignored; no duplicate `outbound_link` for those taps).

## Commit guidance

Suggested milestone commits: (1) models + planners + forced workflow + pipeline, (2) composers + prompts + catalog, (3) web grid + landings, (4) seeds + API + docs + tests.
