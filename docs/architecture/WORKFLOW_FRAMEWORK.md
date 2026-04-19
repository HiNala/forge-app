# Workflow framework (extending Forge)

Use this pattern when adding a new `page_type` / workflow.

## 1. Data & constraints

- Register `page_type` in the DB check constraint (BI-01) and any specialized tables (e.g. `decks` for `pitch_deck`).
- RLS: tenant-scoped rows on `organization_id`.

## 2. Intent & composition

- **Intent parser** (`app/services/orchestration/intent_parser.py`): extend JSON shape / heuristics so the model returns your `page_type` and fields.
- **Assembly** (`page_composer`, `pipeline.py`): map intent → HTML sections; validate with `html_validate`.
- **SSE** (`stream_page_generation`): same `intent` → `html.chunk` → `html.complete` stream.

## 3. Studio

- Add refine chips in `_refine_suggestions_for_page_type` if needed.
- Optional: `workflow_clarify` heuristic in `workflow_clarify.py` when multiple workflows overlap.

## 4. Surface config (web)

- `apps/web/src/lib/workflow-config.ts` — `getWorkflowSurfaceConfig(pageType)` drives:
  - Dashboard chips and filters
  - Page Detail tabs (e.g. Export vs Automations)
  - Header actions (Present, Share, etc.)

## 5. Page Detail & analytics

- Overview: workflow-specific widgets (appointments, pipeline status, deck snapshot).
- **Analytics** (`page_analytics` / `org_analytics`): emit events for funnel, engagement, presenter sessions as appropriate.

## 6. Templates & seeds

- Seed `templates` with `page_type` and gallery category tags.
- Gallery links use `?q=` to filter marketing copy.

## 7. Public runtime

- `public_runtime.py`: inject trackers, proposal/deck runtime, and **Made with Forge** badge (`public_brand_badge.py`) for Starter/trial plans.

## 8. Tests

- Contract tests for new API routes.
- Heuristic tests for intent/clarify.
- UI smoke: dashboard filters, Page Detail tabs, Studio priming.
