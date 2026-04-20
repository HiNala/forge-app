# Mission O-02 — Intent parsing, planning & agent pipeline (report)

## Delivered

### Intent

- **`PageIntent`** expanded with `workflow`, `confidence`, `headline` / `subheadline`, nested intents, `alternatives`, `assumptions`, and normalization in a single `before` validator (`models.py`).
- **`parse_intent`** in `intent.py` uses `structured_completion` (`intent_parser` role) with taxonomy text; heuristic fallback when LLM is unavailable.

### Planning

- **`PagePlan` / `SectionSpec` / `BrandTokens`** in `planning_models.py`.
- **Deterministic planners** under `planners/` (`contact_form`, `proposal`, `pitch_deck`, `landing`, `menu`, `rsvp`, `default`) and `plan_for_intent`.
- **`build_assembly_from_intent`** maps plans to existing template `AssemblyPlan` (`plan_to_assembly.py`). The old **compose LLM** path for assembly was removed.

### Graph

- **`graph.py`** (`Graph`, `GraphNode`, `GraphEdge`) and **`GraphState` / `RunBudget` / `ReviewResult`** (`graph_state.py`).
- **`reviewer.py`** stub (zero fixables) until O-04.
- **`section_edit_graph.py`** stub documenting the future section-edit graph.

### Pipeline & SSE

- **`pipeline.py`** emits `clarify`, `plan`, `compose.*`, `review.*`, `validate.complete`, `persist`, `done` (while keeping `html.*` for compatibility).
- **`validate_compose_graph`** in `html_validate.py` (tokens, `data-forge-section`, form when required, image `alt`).

### Persistence

- **`orchestration_runs`** table + **`OrchestrationRun`** model; `record_run` on successful generate (best-effort; errors logged).

### API

- **`POST /studio/generate/continue`** — placeholder **501** until F-04 session wiring.

### Tests

- `tests/test_o02_planners.py`, `tests/test_o02_graph.py` (existing `test_w04_workflow_clarify` kept green).

### Docs

- `docs/architecture/GRAPH_PIPELINE.md`
- `docs/architecture/CLARIFY_FLOW.md`
- `docs/runbooks/INTENT_DEBUGGING.md`

## Deferred / backlog

- Full **review → refine** loop with conditional routing and `degraded_quality` chips (O-03/O-04).
- **Section-edit** and **whole-page refine** graphs unified with `Graph.run` + shared persistence.
- **92% intent accuracy** corpus + CI; **chaos**, **load**, **cost ceiling** tests.
- **`generate/continue`** implementation with session store and planner re-entry.
- **Admin UI** for `orchestration_runs`.

## Verification

```bash
cd apps/api
python -m pytest tests/test_o02_planners.py tests/test_o02_graph.py tests/test_w04_workflow_clarify.py -q
```
