# Quality & review debugging (O-04)

## When reviews seem off

1. **Inspect orchestration run** — `orchestration_runs.review_findings` JSONB stores the full report (findings, quality score, voice snapshot).
2. **Prompt** — `apps/api/app/services/llm/prompts/reviewer.v1.md` is the system template; check `workflow`, `weights_table`, and ComponentTree payload size (truncation).
3. **Weights** — `workflow_weights.weights_for_workflow()` — increase multipliers for experts that should dominate a workflow.
4. **Timeouts** — main LLM review is capped at **20s**; voice drift at **12s**. On timeout the pipeline **fails open** (empty LLM findings, deterministic checks still apply). Logs: `review_llm_failed`, `review_parallel_failed`.

## Metrics

- In-memory buffer: `review.metrics.snapshot_review_metrics`.
- Admin UI: `/admin/orchestration-quality` (Forge operator org) — aggregates `avg_quality_score` from recent runs with `review_findings`.

## CI / tests

- `tests/test_o04_review.py` — panel size, proposal math, form integrity, merge weights.
