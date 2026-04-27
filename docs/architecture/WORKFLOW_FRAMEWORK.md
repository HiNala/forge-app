# Workflow framework (extending Forge)

Use this pattern when adding a new `page_type` / workflow. **Mission P-06** expanded the surface to **15 marketing workflow landings** and **~14 page-backed types** in Studio (plus `mobile_app` and `website` canvas modes).

## 1. Single sources of truth

- **`app/services/workflows/registry.py`** — `WORKFLOW_DEFINITION` metadata (display name, category, `page_type`, `composer_key`, credits, comparison blurb) for product surfaces.
- **`app/services/orchestration/planning_models.py`** — add to `WorkflowPlanType`.
- **`app/services/orchestration/models.py`** — extend `PageType`, `WORKFLOW_TO_PAGE_TYPE`, `PAGE_TYPE_TO_WORKFLOW`.
- **Intent** — `app/services/orchestration/intent.py` taxonomy + heuristics; optional **`forced_workflow`** on `/studio/generate` resolved by `app/services/orchestration/forced_workflow.py`.

## 2. Planners & composers

- **Planner** — `app/services/orchestration/planners/<name>.py`, registered in `planners/__init__.py:plan_for_intent`.
- **Composer** — `app/services/orchestration/composer/*.py` + `app/services/llm/prompts/composers/<name>.v1.md`, registered in `composer/registry.py` (`_COMPOSERS`, `workflow_key_for_intent`).

## 3. Components

- Add IDs to `component_lib/catalog.py` and **either** a Jinja template in `component_lib/templates/` **or** rely on `generic_semantic.jinja.html` for early iterations.

## 4. Data & constraints

- `pages.page_type` is `String(32)`; Alembic **`p06_page_type_check`** adds a PostgreSQL `CHECK` aligned with `PageType` in code.
- RLS: tenant-scoped rows on `organization_id`.

## 5. Studio

- **Empty state** — `apps/web/src/components/studio/studio-workflow-grid.tsx` (4×4 with category labels).
- `forced_workflow` is sent on generate when a tile (or `?workflow=`) sets `pendingForcedWorkflowRef` in `studio-workspace.tsx`.

## 6. Surface config (web)

- `apps/web/src/lib/workflow-config.ts` — `getWorkflowSurfaceConfig(pageType)` drives dashboard chips, Page Detail labels, and tab copy.

## 7. Page Detail & analytics

- Overview + workflow-specific language via `getWorkflowSurfaceConfig`.
- **Analytics** — `app/services/analytics/track_public._workflow_for_page_type` should map new `page_type` strings for funnel metadata.

## 8. Templates & seeds

- Curated rows in `app/seed_templates_data.py` and optional YAML in `apps/api/fixtures/templates/`.
- `scripts/seed_templates.py` upserts; `intent_json.page_type` powers template browser hints (`TemplateListItemOut.page_type` on list API).

## 9. Marketing

- `apps/web/src/lib/workflow-landings.ts` — `WORKFLOW_SLUGS` + `WORKFLOW_LANDINGS` for `/workflows/[slug]`.
- Index: `/workflows` lists all slugs; linked from the marketing nav.

## 10. Public runtime

- `public_runtime.py`: inject trackers, proposal/deck runtime, and **Made with Forge** where applicable.

## 11. Tests

- Workflow registry / intent / `forced_workflow` — see `apps/api/tests/test_p06_workflow_surface.py`.
- Contract tests for any new API fields (e.g. template list `page_type`).
