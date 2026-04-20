# Mission O-01 — Provider abstraction & context gathering (report)

## Delivered

### LLM layer

- **`app/services/llm/`** — `types.py` (`Message`, `CompletionChunk`, `CompletionResult`), `pricing.py`, `provider.py` (`LiteLLMUnifiedProvider` + protocol), `llm_router.py` (`ROUTES`, `structured_completion`, `completion_with_cost`).
- **`app/services/ai/router.py`** — attaches **`cost_cents`** estimates to completion metadata.
- **Exceptions:** `LLMSchemaError`, `DependencyError` in `app/services/ai/exceptions.py`.

### Context gathering

- **`app/services/context/`** — `models.py` (`ContextBundle`, `SiteBrand`, `VoiceProfile`, …), `budget.py`, `urls.py`, `site_extract.py`, `gather.py`.
- **Pipeline:** `gather_context` before `parse_intent`; merges `site_brand` into brand colors/fonts when kit is sparse; passes **`context_block`** into intent parser.
- **SSE:** `context`, `context.gathered`, `context.brand.extracted`, `context.voice.inferred`, `context.products.found`.

### Tests

- `tests/test_o01_context_budget.py`, `tests/test_o01_urls.py`.

### Docs

- `docs/architecture/LLM_ORCHESTRATION.md`
- `docs/architecture/CONTEXT_GATHERING.md`
- `docs/runbooks/LLM_DEBUGGING.md`

## Intentionally deferred / backlog

- Native OpenAI / Anthropic / Gemini SDKs as separate classes (LiteLLM remains the production adapter; protocol allows swap-in).
- Redis `llm:call` / `context:url` caches, `site_brand_cache` table, robots.txt guard, Brand.dev/Firecrawl primary extraction.
- Full `VoiceProfile` / products via LLM, `prompts/*.v1.md` versioning registry + CI fixture harness for every prompt.
- Load test (50 concurrent) and chaos tests in CI.
- Per-org provider override from `org_settings` (hook point: `llm_router` + router).

## Verification

```bash
cd apps/api
python -m pytest tests/test_o01_context_budget.py tests/test_o01_urls.py -q
# With uv + litellm installed:
pytest tests/test_llm_router.py -q
```
