# Feedback and design memory (BP-02)

## Data flow

1. **Studio / canvas** — `POST /api/v1/feedback` with `run_id`, `artifact_kind`, `artifact_ref`, sentiment, optional structured reasons.
2. **Idempotency** — unique on `(organization_id, user_id, run_id, artifact_kind, artifact_ref)`; later POSTs replace the row.
3. **Memory** — `apply_feedback_to_memory` maps reasons + actions to `design_memory` rows via `upsert_design_memory` (strength clamps 0–1).
4. **Explainability** — `memory_explanation_bullets` attaches `memory_why` onto the four-layer payload in `html.complete` so Layer 4 can show “why this looks this way”.
5. **Founder analytics** — `GET /api/v1/admin/patterns/feed` + `/recurring` aggregate cross-org when users keep `forge_contribute_feedback_to_platform` enabled (see privacy pref).

## Related tables

- `artifact_feedback` — raw signals.
- `design_memory` — learned preferences (per user + org scope).
- `improvement_reports` — nightly `learning_loop` summaries.
- `page_revisions` — extended with `change_kind`, `quality_score`, etc., for timelines.

## Workers

- `app.services.workers.learning_loop.run_improvement_loop`
- `app.services.workers.critic_calibration.daily_critic_calibration_snapshot`

Trigger manually: `POST /api/v1/admin/patterns/learning-loop/run-once` (platform permission).
