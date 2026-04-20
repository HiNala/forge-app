# Expert composers (Mission O-03)

## Architecture

1. **Planner (O-02)** produces a deterministic `PagePlan` (sections, brand tokens, voice, data hints).
2. **Composer agent** (this mission) calls the LLM with a workflow-specific **system prompt** + auto-generated **component catalog** + voice/brand injection.
3. The model returns a **`ComponentTree`** JSON (or **`ProposalComponentTree`** for proposals with priced line items).
4. **Safety** sanitizes clichés / risky phrasing (`composer/safety.py`).
5. **Render** walks the tree and emits HTML via **Jinja2** templates in `component_lib/templates/`. Brand colors are applied as CSS variables in the existing Forge shell — the LLM does not emit arbitrary hex in class names.

## Key modules

| Path | Role |
|------|------|
| `app/services/orchestration/component_lib/catalog.py` | 40+ registered component IDs + `catalog_markdown_summary()` for prompts |
| `app/services/orchestration/component_lib/schema.py` | `ComponentTree`, `ComponentNode`, `ProposalComponentTree`, `DeckOutline` |
| `app/services/orchestration/component_lib/render.py` | Jinja render + full document shell |
| `app/services/orchestration/composer/base.py` | `BaseComposer` — builds prompts, calls `structured_completion`, renders |
| `app/services/orchestration/composer/registry.py` | Workflow → composer instance; `compose_with_best_agent` |
| `app/services/llm/prompts/composers/*.v1.md` | Versioned system prompts |
| `app/services/llm/composer_prompts.py` | Loader for composer markdown |

## Pipeline integration

`USE_AGENT_COMPOSER` (default **false**) in settings enables the agent path for Studio generation. **Pitch deck** and **proposal** pages stay on the legacy/template + `finalize_*` pipelines in this iteration (proposal uses deterministic `proposal_render` after DB seed).

## Adding a component

1. Add a `ComponentDef` row to `COMPONENT_CATALOG`.
2. Add `templates/<name>.jinja.html` (or rely on `generic_semantic.jinja.html`).
3. Document props in the template comment block.
4. Extend composer prompts if the component needs copy rules.

## Deck two-stage pattern

`DeckOutline` + `pitch_deck_outline.v1.md` define the strategic outline. Per-slide expansion remains in the W-03 deck pipeline (`deck_service` / `deck_render`). Wiring outline → expand in one graph is a follow-up.
