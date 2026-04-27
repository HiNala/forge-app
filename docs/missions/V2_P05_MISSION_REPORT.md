# V2 Mission P-05 — Canvas-aware orchestration (report)

## Delivered

- **Scope hierarchy** — `ScopeLevel`, `Scope`, `ScopedComposer` protocol, reference safeguards (`scope.py`).
- **Multi-modal** — `VisionInput` on `ContextBundle`, `vision_text_block` / `to_prompt_context` integration, `context.vision` SSE, `vision_attachment_ids` on generate/refine, **presign + register** Studio attachment APIs, `studio_attachments` table, stub **feature extraction** on register.
- **Region drift** — `region_hash.py` (fingerprints, drift list, feature merge).
- **Project-wide** — consent DTO stub (`project_wide.py`).
- **Clarify / plan** — `clarify_payloads.py`, `plan_mode.py` DTOs for incremental UI + orchestration wiring.
- **Model routing (DB + cache)** — `llm_routing_policies`, `llm_routing_history` tables, `effective_model_route`, `bump_routing_version`, `structured_completion` uses DB/org overrides for **temperature** (and route object for future model selection).
- **Brand drift (generalized heuristics)** — `brand_drift.py` color palette check.
- **Docs** — `CANVAS_ORCHESTRATION.md`, `MODEL_ROUTING.md`, `ORCHESTRATION_DEBUGGING.md` runbook.

## Not yet complete (explicit follow-up)

- Wire **primary model + fallbacks** from `llm_routing_policies` into `ai.router` completion (today: temperature from policy; model chain still env/router defaults).
- **Arq job** `extract_vision_features` for real OCR/vision; PDF rasterization.
- **Region-edit graph** full integration: drift-fix refiner, `unscoped_drift` chip, p95 performance work.
- **Clarify SSE** payloads for scope/breakpoint/reference in `pipeline.py` + Studio chips + 12s dismiss.
- **Admin UI** for routing + `model_routing_history` writes; Redis 1s pub/sub fan-out to all workers.
- **Plan mode** execution engine + **credit.charged** / **per-section** SSE polish.
- **Eval harness** expansion and quality regression job.

## Tests

See `apps/api/tests/test_p05_orchestration.py` (unit-level scope, region hash, brand drift, routing fallbacks to code defaults when DB empty).
