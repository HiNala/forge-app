# LLM debugging

## “All models failed”

1. Check `/health` or logs for `openai_configured` / API keys.
2. `LLM_FALLBACK_MODELS` — ensure a model that matches an available key (OpenAI vs Anthropic vs Gemini prefixes for LiteLLM).
3. Rate limits: look for 429 in logs; temporarily switch `LLM_DEFAULT_PROVIDER` or reduce concurrency.

## Wrong page type / JSON intent

1. Inspect intent prompt: `app/services/orchestration/prompts/intent_system.md`.
2. Confirm `context_block` from `ContextBundle` is not overwhelming the user prompt (see `CONTEXT_GATHERING.md`).
3. Run with `LLM_LOG_METRICS=true` and compare `prompt_tokens` vs prior deploys.

## Costs spike

1. `meta.cost_cents` on `completion_text` returns (router) — compare per-task `compose` vs `intent`.
2. `LLM_MODEL_COMPOSE` / `LLM_MODEL_INTENT` env — downgrading compose saves the most.
3. `pricing.py` — update rates if estimates diverge from billing.

## Provider-specific streaming

- Stream debugging: `LiteLLMUnifiedProvider.stream_complete` — log raw chunk shape if LiteLLM changes delta format.

## Schema errors

- `LLMSchemaError` after structured completion → model returned non-JSON or invalid shape; capture prompt + response in Sentry (redact PII).
