# LLM provider outage

## Expected behavior

- Router uses `LLM_FALLBACK_MODELS` and alternate providers when configured (`apps/api` LiteLLM router).
- Users may see **errors in Studio** if all providers fail.

## Response

1. Check provider status pages (OpenAI, Anthropic, Google).
2. **Rotate** to a healthy model via env: `LLM_MODEL_COMPOSE`, `LLM_MODEL_INTENT`, `LLM_MODEL_SECTION_EDIT` and redeploy API.
3. If keys are invalid, rotate **API keys** in Railway and provider console.
4. Communicate on status page if generation is degraded for >15 minutes.

## Post-incident

Record error rate in Sentry; tune fallbacks and timeouts (`LLM_TIMEOUT_SECONDS`).
