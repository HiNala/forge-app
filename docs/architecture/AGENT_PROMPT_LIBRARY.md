# Agent prompt library (BP-01)

All BP-01 LLM-facing prompts live under:

`apps/api/app/services/orchestration/prompts/agents/`

## Versioning

- Filename pattern: `{agent}.v1.md` — bump **v2** when behavior changes materially.
- Couple prompts to **`product_brain.schemas`** — if the schema changes, bump version and refresh JSON exemplars inside the markdown.

## House style

1. Stable **system** block first (cache-friendly).
2. Explicit constraints matching Pydantic (required keys, enums).
3. Few-shot exemplars where workflow ambiguity is common (intent & strategy).

## Inventory

| File | Role |
|------|------|
| `intent.v1.md` | Intent Agent → `IntentSpec` |

Strategy, flow, system, UI, critic prompts are scaffolded inline in `product_brain/agent_runners.py` pending full file extraction (same versioning rules apply).
