# Intent debugging

## Quick checks

1. **Logs** — search for `intent_schema`, `intent_llm_failed`, `intent_no_llm` in API logs.
2. **Structured output** — `parse_intent` uses `structured_completion` with `PageIntent`. Validation errors trigger one retry with the error text appended.
3. **Fallback** — If the LLM is unavailable, `_heuristic_intent` in `intent.py` uses proposal/deck heuristics or a low-confidence `other` intent with alternatives.

## Common symptoms

| Symptom | Likely cause |
|---------|----------------|
| Always `custom` / `other` | LLM disabled or schema mismatch; check `LLMSchemaError` |
| Wrong workflow | Prompt too vague; improve `intent_system.md` or taxonomy in `intent.py` |
| Clarify spam | Model under-confident; tune temperature or examples |

## Inspecting production intent

- `pages.intent_json` stores the latest `PageIntent` dump.
- `orchestration_runs.intent` stores per-generation intent when the row is written successfully.

## Improving accuracy

- Extend `INTENT_TAXONOMY` in `intent.py` with real user phrases.
- Add evaluation fixtures (temperature 0) comparing `workflow` to labels — future CI hook.
