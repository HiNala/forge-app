# Ten-agent product orchestration (BP-01)

Forge’s **Product Orchestrator** lives in `app/services/orchestration/product_brain/`. It sits **in front** of the legacy Studio HTML pipeline (`legacy_pipeline.py`) and maps structured **IntentSpec → PageIntent**, then reuses `complete_studio_prep_from_gathered` plus `stream_studio_page_generation_tail` so published pages stay HTML-first while product reasoning, spec JSON, TSX payloads, and suggestions are exposed as **four layers**.

## Graph (standard path)

1. **Intent** (producer; LLM role `intent_parser`) — `IntentSpec`; prompt file `prompts/agents/intent.v1.md`.
2. **Strategy** (producer; `composer`) — `ProductStrategy`; skipped on “simple” prompts with a deterministic mini-strategy.
3. **Flow + design_system** (`graph_engine.parallel_all`) — `UXFlow` plus `DesignTokens`.
4. **System** — `SystemSpec`.
5. **UI** — structured `ComponentTree` JSON toward the composer.
6. **Code** — `CodeArtifacts` (starter TSX scaffold).
7. **Critic** (proposes only; LLM role `reviewer`) — `CritiqueReport` across eight dimensions.
8. **Judge** (`judge_rules.decide_judge`) — deterministic ship / iterate / abort (no LLM).
9. **Refiner** — targeted refinement hook (placeholder; refinement still flows through legacy review where applicable).
10. **Memory** — persists `design_memory` rows after judge **ship** via `memory_store.persist_memory_writes`.

Fan-out guard: **`len(agent_calls) <= 14`**, configurable wall time in `RunBudget`. SSE emits `orchestration.four_layer` and **`html.complete`** includes `four_layer` when present. Run traces additionally embed `bp01_agent_calls` / `bp01_four_layer` inside `review_findings` JSON on `OrchestrationRun`.

## Studio (web)

- SSE: `orchestration.phase` (status line), `orchestration.judge`, `orchestration.four_layer`, legacy `clarify`, `html.complete.four_layer`.
- **Studio chat** shows a **Reasoning / Spec / Code / Next moves** tab strip on the artifact card when layers are present (`apps/web` — `StudioFourLayerPanel`, `lib/forge-four-layer.ts`).

## Enabling

- Set **`USE_PRODUCT_ORCHESTRATOR=true`** (see `.env.example`). Default is **off** so CI and existing benchmarks stay unchanged.
- **Studio** wires `/studio/generate` and `/studio/refine` to `stream_product_page_generation` when the flag is on.

## Migration

Revision **`p08_design_memory_bp01`** provisions **`design_memory`** (RLS) and optional **`orchestration_runs`** columns **`agent_calls`** / **`four_layer_output`**.

## Tests

See `apps/api/tests/test_bp01_judge_rules.py`.
