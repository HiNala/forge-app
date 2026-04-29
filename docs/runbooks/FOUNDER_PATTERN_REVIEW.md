# Founder pattern review (playbook)

## Weekly cadence

1. **Patterns feed** — `/admin/patterns` (API: `/api/v1/admin/patterns/feed?days=7`). Sort mentally by negative sentiment × high-traffic workflows.
2. **Recurring groups** — `/api/v1/admin/patterns/recurring` surfaces `(artifact_kind, reasons, action)` buckets.
3. **Cross-check runs** — `/api/v1/admin/orchestration-runs` now supports `min_quality` / `max_quality` when `quality_score` is populated on rows; open `/api/v1/admin/orchestration-runs/{id}` for `agent_calls` / `four_layer_output`.
4. **Decide** — stable for 2+ weeks + high volume → prompt change candidate. One-off spikes → wait.
5. **Ship** — use existing prompt-versioning discipline (O-03) with staged rollout; track the same pattern ID week-over-week.

## When *not* to act

- Sample size &lt; ~30 similar events in 30 days.
- Strong seasonality (major holiday templates) without baseline.

## Learning loop

Nightly job writes `improvement_reports`. Operators can run `POST /api/v1/admin/patterns/learning-loop/run-once` after deploys to seed a row immediately.
