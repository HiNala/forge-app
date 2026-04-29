# MISSION BP-02 — Feedback, memory & learning (report)

## Shipped

- **Schema + migration fix** — `bp02_feedback_memory` no longer recreates `design_memory` (owned by `p08_design_memory_bp01`); adds `artifact_feedback`, `page_revisions` extras, `improvement_reports`, analytics `feedback_submitted`, orchestration `quality_score`/`dimension_scores`. **Merge revision** `merge_bp02_aal03` unifies the prior dual Alembic heads.
- **API** — `POST /api/v1/feedback` (idempotent upsert + `apply_feedback_to_memory`); `GET/PATCH/DELETE /api/v1/design-memory/*` + `POST /api/v1/design-memory/reset`; admin `GET /api/v1/admin/patterns/*` + operator `POST .../learning-loop/run-once`; `GET /api/v1/pages/{id}/revisions`; admin orchestration list filters + richer run detail fields.
- **Memory explainability** — `memory_explanation_bullets` merges `memory_why` into the BP-01 four-layer payload for Studio when `forge_apply_memory` is enabled; otherwise `memory_why` is omitted (and legacy four-layer content is stripped).
- **Web** — `ArtifactFeedbackStrip` + Studio artifact card wiring; four-layer “Why this looks this way”; Settings **Memory** + **Privacy**; Admin **Patterns** page; analytics-friendly user prefs keys.
- **Workers (library)** — `learning_loop.py`, `critic_calibration.py` stubs callable from cron/admin.
- **Tests** — `tests/test_bp02_feedback_api.py` (pure extraction coverage).
- **Docs** — `FEEDBACK_AND_MEMORY.md`, `FOUNDER_PATTERN_REVIEW.md`, `MEMORY_AND_FEEDBACK.md`, `DESIGN_MEMORY_GUIDE.md`.

## Honest gaps / follow-ups

- **Canvas / deck / code viewers** — mobile + web canvas frames now use `ArtifactFeedbackStrip` with distinct `artifact_ref`s and the last Studio orchestration `run_id` (session + `forge-orchestration-run` event); slide grid and code viewer still need wiring.
- **Compare / restore UX** — API lists revisions; side-by-side diff + restore-as-new UX not built.
- **LLM NLP-light extraction** — regex-heavy `feedback_to_memory`; cheap LLM slot reserved for richer refine parsing.
- **Founder prompt workflow + nightly schedules** — pattern dashboard MVP only; rollout ladder + Slack bot + Celery/arq cron wiring still pending.
- **Weekly email digest + critic correlation automation** — data model/prefs stubs only.
- **Performance tests** — not automated here (budgets in acceptance criteria).

## Adjacent fixes

- Alembic **dual-head** merged; `analytics_events` taxonomy includes **`feedback_submitted`** via BP-02 migration.
- **Admin orchestration** list/filter + detail payloads extended for diagnostics.
