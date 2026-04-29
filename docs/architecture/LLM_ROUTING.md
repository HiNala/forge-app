# LLM routing (AL-03)

Forge routes every LLM call through **LiteLLM** (`app.services.ai.router`). The façade for structured/prompt-role selection is **`app.services.llm.llm_router`**.

## Roles (`ROUTES`)

| Role | Typical LiteLLM task bucket | Primary model (built-in default) |
|------|------------------------------|----------------------------------|
| `intent_parser`, `multimodal_intent_parser` | intent | `gpt-4o-mini` + Haiku/Gemini fallbacks |
| `composer`, `mobile_composer`, `web_composer`, `vision_extractor` | compose | `gpt-4o` + Sonnet/Gemini |
| `section_editor`, `region_refiner` | section_edit | `gpt-4o-mini` + Haiku |
| `reviewer` | review | `gpt-4o` |

DB policies (`llm_routing_policies`) override defaults per org/platform; fall back to **`ROUTES[role]`** or `composer`.

## Overrides

Environment variables (`LLM_MODEL_*`, `LLM_DEFAULT_PROVIDER`) still remap tasks — see `app.services.ai.router._primary_model`.

**Do not** add parallel OpenAI/Google SDK shim modules — extend LiteLLM model strings or DB routing rows instead.
