# LLM orchestration (O-01)

## Layers

1. **`app/services/ai/router.py`** — production path: **LiteLLM** `acompletion` with per-task models, timeouts, fallback chain, usage persistence, and **estimated `cost_cents`** via `app/services/llm/pricing.py`.
2. **`app/services/llm/provider.py`** — `LiteLLMUnifiedProvider` implements the **normalized** `LLMProvider` protocol: non-stream `complete()`, stream `stream_complete()` with `CompletionChunk` deltas (text, tool deltas, finish).
3. **`app/services/llm/llm_router.py`** — `ROUTES` / `ModelRoute` table, `structured_completion()` (JSON + Pydantic validate + one retry), `completion_with_cost()` helper.

## Routing & fallback

- Task names: `intent`, `compose`, `section_edit` map to `LLM_MODEL_*` env and `LLM_FALLBACK_MODELS` (comma-separated).
- Session/provider override: Studio `provider` body still passed through to `completion_text`.
- Failures: try each model in chain; all fail → `LLMProviderError`.

## Structured outputs

- Prefer `structured_completion(role, schema, ...)` for new agents; it appends JSON schema guidance and retries once on validation failure → `LLMSchemaError` from `app/services/ai/exceptions.py`.

## Costs

- `pricing.py` holds approximate USD/MTok rates; `estimate_cost_cents` is best-effort for dashboards and alerts.

## Metrics

- `record_llm_metric` + structured logs (`llm_call` JSON) on each successful completion.
