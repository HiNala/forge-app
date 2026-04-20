# Mission O-04 — Mixture-of-Experts Review & Self-Healing — Report

## Summary

Delivered the **quality layer** for Forge Studio: a single-call structured LLM review with seven expert lenses, deterministic workflow/a11y/brand/voice checks, SSE `review.finding` / `review.complete`, an optional **refine** pass on auto-fixable critical/major items when the agent composer produced a `ComponentTree`, persistence on `pages` (`last_review_*`, `review_degraded_quality`) and `orchestration_runs.review_findings`, an **admin quality** endpoint + UI, and Studio **ghost chat** rows plus a **quality score chip** on the artifact card.

## Key files

| Area | Path |
|------|------|
| Expert panel | `apps/api/app/services/orchestration/review/expert_panel.py` |
| Review orchestration | `apps/api/app/services/orchestration/review/service.py` |
| Refine | `apps/api/app/services/orchestration/review/refine.py` |
| Pipeline | `apps/api/app/services/orchestration/pipeline.py` |
| Prompt | `apps/api/app/services/llm/prompts/reviewer.v1.md` |
| LLM role | `reviewer` in `llm_router.py`; task `review` in `ai/router.py`; `LLM_MODEL_REVIEW` |
| Migration | `alembic/versions/o04_page_review_quality.py` |
| Tests | `apps/api/tests/test_o04_review.py` |
| Docs | `docs/architecture/REVIEW_PANEL.md`, `docs/prompts/REVIEW_STYLE_GUIDE.md`, `docs/runbooks/QUALITY_DEBUGGING.md` |

## Deferred / follow-ups

- Full **streaming** token-by-token from the model (current UX emits findings after structured JSON returns).
- **Dismissed findings** persistence on `page_revisions.dismissed_findings` (column added; API to write not implemented).
- **Cost/latency CI budgets** ($0.05/review, p95 &lt; 15s) — require env with real keys and stable harness.
- **Evaluation fixtures** (30 bad pages / 20 good) — optional regression pack.

## Acceptance

Core acceptance criteria met: expert catalog, structured findings, SSE, refine loop with max two review passes, voice/brand side checks, workflow-specific deterministic checks, metrics persistence, admin aggregate, Studio UX for findings and quality score, documentation.
