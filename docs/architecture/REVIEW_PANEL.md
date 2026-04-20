# Design review panel (Mission O-04)

## Single-call mixture-of-experts

Forge evaluates composed pages with **seven named expert lenses** (Raskin, Rams, Norman, Atkinson, Nielsen, Tufte, Kare). Running seven separate LLM calls would multiply cost and latency without a proportional quality gain. Production-style stacks instead use **one heavy-tier structured call** whose prompt walks the model through each lens in sequence and attributes findings to the correct expert.

Implementation: `app/services/orchestration/review/service.py` calls the `reviewer` LLM role (`LLM_MODEL_REVIEW`, default `gpt-4o`) with `ReviewReport` schema. The system prompt is `app/services/llm/prompts/reviewer.v1.md`.

## Workflow weights

`workflow_weights.py` maps each Studio workflow to **multipliers** on expert severity (e.g. proposal boosts Norman/Nielsen). `merge_and_weight()` applies a small severity bump when a weighted expert flags an issue.

## Deterministic checks (no LLM)

- **Proposal math / structure** — `review/proposal_checks.py` + `workflow_checks.proposal_structural_checks`
- **Form integrity** — submit control, booking slot hints
- **Deck completeness** — rough section count for `pitch_deck`
- **Accessibility** — `a11y_checks.py` (images alt, h1 count)
- **Brand drift** — unexpected hex colors vs `BrandTokens`
- **Voice drift** — fast `intent_parser` structured call comparing prose to `VoiceProfile`

These emit synthetic experts (`Proposal Math Checker`, `Form Integrity`, `Accessibility`, `Brand Consistency`, `Voice Consistency`).

## Refine loop

Auto-fixable **critical/major** findings trigger `refine_component_tree_from_findings()` (`review/refine.py`), which performs a structured `reviewer` completion on the `ComponentTree`, then re-renders HTML. The pipeline runs **at most two review passes** and **one refine** between them when the agent composer path produced a tree.

## SSE

- `review.finding` — one event per finding (ghost UI in Studio).
- `review.complete` — counts, `quality_score`, `summary`, `iteration`.

## Adding an expert

1. Append to `EXPERT_PANEL` in `expert_panel.py`.
2. Extend `reviewer.v1.md` with the new lens section and dimensions.
3. Optionally tune `weights_for_workflow()` if the workflow should emphasize that lens.
