# Mission AL-03 — report (Forge)

## Summary

This mission wires **canvas persistence**, **honest exports**, **structural drift checks**, **LLM routing clarity**, **studio continuation TTL**, **worker placeholders replaced with real logging/idempotency hooks**, and **documentation** for launch truthfulness.

### Canvas

- Migration `aa03_canvas_projects`: `canvas_projects`, `canvas_screens`, `canvas_flows`, `canvas_screen_revisions` + RLS, plus `orchestration_runs.graph_state` / `clarify_expires_at`.
- Models in `apps/api/app/db/models/canvas.py` and REST surface `apps/api/app/api/v1/canvas.py`.
- Frontend wiring (autosave/chat/undo/e2e) remains **tracked follow-up**.

### Dedicated composers & registry

- `MobileAppComposer` / `WebsiteComposer` + prompts `mobile_app.v1.md`, `website.v1.md`.
- `workflow_key_for_intent`, `WorkflowPlanType`, and `WorkflowDefinition` updated so `website`/`mobile_app` advertise **ship-ready** exports only (`hosted`, static HTML kit, iframe embed, webhook snippet, DNS handoff text).

### Region validation

- `component_tree_diff.py` exposes `diff_component_trees`, `validate_region_edit`, with unit coverage in `tests/test_component_tree_diff.py`.

### Studio continuation

- `StudioGenerateContinueRequest` accepts `run_id` + clarification metadata.
- `/studio/generate/continue` rejects expired runs (`410`) when TTL metadata is present.

### Exports / catalog honesty

- `ExportFormatSpec.hidden_in_ui`, `EXPORT_CATALOG` helper `get_user_facing_export_specs`, and `ExportService.list_formats` hide roadmap-only identifiers from pickers automatically.

### LLM infra

- LiteLLM log lines now emit real `cost_cents`.
- Deleted stub SDK files `openai_provider.py` / `gemini_provider.py`.
- Added explicit canvas/vision routes in `llm_router.ROUTES`.

### Workers

- `calendar_create_event`: validates submissions + tenant config, returns deterministic status strings (Google calendar insert still roadmap).
- `page_screenshot`: UUID validation + log hook awaiting Playwright queue.
- `ai_cost_aggregate`: hourly counter over `OrchestrationRun` timestamps for observability.

### Adjacent / still open

- Multimodal PDF pipeline + Pillow k-means dependency is **not fully landed** beyond improved guidance text.
- OpenAPI client regen (`pnpm openapi` / BI-02) needed after deployments.
