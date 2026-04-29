# MISSION BP-01 — Ten-agent orchestration (status)

## Shipped in tree

- **Product Orchestrator** — `apps/api/app/services/orchestration/product_brain/orchestrator.py` streams `orchestration.phase`, `orchestration.judge`, `orchestration.four_layer`, then attaches to legacy compose/persist.
- **Legacy split** — `legacy_pipeline.py` + `pipeline.py` façade; `gather_studio_context_bundle` / `complete_studio_prep_from_gathered` for single context pass.
- **Deterministic Judge** — `judge_rules.py` + unit tests.
- **Design memory table** — Alembic `p08_design_memory_bp01` + `DesignMemory` persistence.
- **Studio** — Four-layer tabs on page artifact when `four_layer` arrives (SSE + `html.complete`); clarify event `clarify` handled; orchestration status line during generate.
- **Metrics** — Prometheus counters in `product_brain/metrics.py`; Sentry breadcrumbs on agent start (`agent_runners._start_call`).
- **Orchestration runs** — `record_run` persists `agent_calls` and `four_layer_output` on `orchestration_runs` when BP-01 populates pipeline state (same payload as `review_findings` extras).
- **Docs** — `TEN_AGENT_ORCHESTRATION.md`, `ORCHESTRATION_DEBUGGING.md`, `AGENT_PROMPT_LIBRARY.md`.

## Honest gaps

- No 50-fixture nightly eval with live LLM budgets; smoke tests only (`tests/orchestration/test_eval_fixture_smoke.py`).
- Refiner is a placeholder; tree diff validator not wired (per AL-03 spec).
- Prompt caching not implemented at the provider layer yet.
- Demo video / Claude Design side-by-side captures are **not** produced inside this repo artifact (record manually when ready).

## Next (BP-02+)

- Surface design memory editing in Studio; wire “ignore memory for this run”.
- Full prompt file migration from inline `agent_runners` strings.
- Admin UI to browse `agent_calls` / `four_layer_output` on `orchestration_runs` (columns exist; no product surface yet).
