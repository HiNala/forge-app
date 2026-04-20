# Graph pipeline (Mission O-02)

## Overview

Forge Studio generation uses a **directed graph** pattern (LangGraph-style) with explicit nodes, conditional edges, and a terminal state. The runtime lives in `app/services/orchestration/graph.py`; shared state is `GraphState` in `graph_state.py`.

## Generate path (implemented in `pipeline.py`)

For streaming SSE, the logical order is:

1. **Context gather** (O-01) — `gather_context`
2. **Intent parser** — `parse_intent` (`intent.py`) → structured `PageIntent`
3. **Clarify (non-blocking)** — SSE `clarify` when `confidence < 0.85`
4. **Planner** — deterministic `plan_for_intent` → `PagePlan` → `build_assembly_from_intent` → `AssemblyPlan`
5. **Composer** — template assembly (`render_section`, `assemble_html`) with SSE `compose.*`
6. **Review** — stub (`reviewer.py`) → SSE `review.*`
7. **Validator** — `validate_generated_html` + `validate_compose_graph`
8. **Persistence** — page + revision + optional `orchestration_runs` row
9. **Done** — SSE `persist`, `html.complete`, `done`

## State

`GraphState` holds `intent`, `page_plan`, `html`, `review`, `iterations`, `budget` (`RunBudget`), `node_timings_ms`, and `errors`. Full review/refine loops will attach here in O-03/O-04.

## Budgets

`RunBudget` defaults (tokens, LLM calls, wall time, cost) are defined on `GraphState`; nodes are expected to increment usage before expensive calls. The generate pipeline currently records **planner/composer** wall times in `node_timings_ms`.

## SSE

Standard events include `intent`, `clarify`, `plan`, `compose.start`, `compose.section`, `compose.complete`, `review.start`, `review.complete`, `validate.complete`, `persist`, `html.complete`, `done`. Legacy `html.chunk` / `html.start` remain for older clients.

## Observability

Successful runs insert a row into `orchestration_runs` (see migration `o02_orchestration_runs.py`) when the table exists; failures to write are logged and do not block generation.
