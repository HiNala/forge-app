# Orchestration debugging runbook

## Reading a run

1. **Database** — `orchestration_runs` row: `intent`, `plan`, `node_timings`, `review_findings`, optional `agent_calls`, `four_layer_output`, `status`, `total_duration_ms`.
2. **Embeds** — When BP-01 runs, `review_findings` may include `bp01_agent_calls` and `bp01_four_layer` alongside O-04 review data.
3. **Studio** — Toggle `USE_PRODUCT_ORCHESTRATOR=true` and watch SSE: `orchestration.phase`, `orchestration.judge`, `orchestration.four_layer`, then `html.complete` with `four_layer`.

## Quality regressions

1. Check `review_findings.quality_score` (O-04) vs BP-01 `orchestration.judge` payload in SSE.
2. Re-run `pytest apps/api/tests/test_bp01_judge_rules.py` after changing `judge_rules.py`.
3. Compare `node_timings` keys `bp01_*` vs wall time in `total_duration_ms`.

## Tuning prompts

1. Edit versioned files under `apps/api/app/services/orchestration/prompts/agents/*.v1.md`.
2. Keep JSON schema alignment with Pydantic models in `product_brain/schemas.py`.
3. Run API tests; add or extend fixtures under `tests/orchestration/fixtures/`.

## Cost / latency

- Bounded calls: `OrchestratorState.agent_calls` length (cap 14).
- Wall time: `RunBudget.max_wall_time_seconds` in orchestrator.
- Credits: Studio uses a pessimistic placeholder when the product orchestrator is on; adjust when per-run estimates exist.
