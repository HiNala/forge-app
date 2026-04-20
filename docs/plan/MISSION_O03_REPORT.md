# Mission O-03 — Expert composer agents (report)

## Delivered

### Component library

- **`component_lib/catalog.py`** — 40+ `ComponentDef` entries across heroes, content, forms, fields, trust, CTA, pricing, proposal, deck, footer, plus gallery/promo/rsvp/menu aliases.
- **`component_lib/schema.py`** — `ComponentNode`, `ComponentTree`, `ProposalComponentTree`, `DeckOutline`, `SlideOutline`.
- **`component_lib/render.py`** — Jinja2 render, `render_full_document`, `render_top_level_component` for SSE.
- **`component_lib/templates/`** — concrete templates for high-traffic pieces (`hero_split`, `form_stacked`, `field_*`, `footer_minimal`, `cta_primary`, `line_items_table`, `proposal_cover`, …) plus **`generic_semantic.jinja.html`** fallback for catalog IDs without a dedicated file.

### Composers

- **`composer/base.py`** — `BaseComposer` with voice/brand/catalog injection, `structured_completion`, safety pass, proposal math validation for `ProposalComponentTree`.
- **Workflow classes** — contact, landing, promotion, menu, RSVP, gallery, generic, proposal (`composer/`).
- **`composer/registry.py`** — `compose_with_best_agent`, `workflow_key_for_intent`.

### Prompts

- Versioned markdown under **`app/services/llm/prompts/composers/`** (`contact_form`, `proposal`, `landing`, `menu`, `event_rsvp`, `gallery`, `promotion`, `generic`, `pitch_deck_outline`, `refiner`, `section_editor`).
- **`app/services/llm/composer_prompts.py`** loader.

### Safety & math

- **`composer/safety.py`** — cliché / superlative pattern flags + string cleanup.
- **`composer/proposal_math.py`** — subtotal/tax/total validation vs LLM-stated totals.

### Pipeline

- **`USE_AGENT_COMPOSER`** (`config.py`, `.env.example`) — when `true`, Studio uses agent HTML for workflows except **`pitch_deck`** and **`proposal`** (legacy finalize paths preserved).

### Tests

- `tests/test_o03_*.py` — catalog size, render, proposal math, safety.
- Fixture stub: `tests/prompts/composers/fixtures/contact_min.json`.

### Docs

- `docs/architecture/COMPOSERS.md`
- `docs/prompts/COMPOSER_STYLE_GUIDE.md`

## Deferred / backlog

- **True streaming** structured output (`structured_stream` partials) for live section-by-section JSON completion.
- **40+ unique Jinja files** — many components still resolve through `generic_semantic`; add templates incrementally.
- **Full evaluation harness** (20+ fixtures per composer, voice-match scorer, CI gate, `composer_eval_report.md`).
- **Content safety** beyond regex (LLM verifier, org policy).
- **Deck** outline → parallel slide expand integrated with graph + cost split (fast vs heavy models).
- **Proposal** agent path integrated with `proposal_render` / DB line items (currently excluded from agent pipeline).
- **Performance/cost** tests (p95 latency, $/page budgets).

## Verification

```bash
cd apps/api
python -m pytest tests/test_o03_catalog.py tests/test_o03_render.py tests/test_o03_proposal_math.py tests/test_o03_safety.py -q
```
