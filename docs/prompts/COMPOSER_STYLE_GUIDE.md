# Composer system prompt style guide

## File layout

- Path: `apps/api/app/services/llm/prompts/composers/<workflow>.v1.md`
- Version in filename: `v1`, `v2`, … — bump when behavior changes meaningfully.

## Required sections

1. **Role** — who the agent “is” and which designer voices inform decisions (short list).
2. **Voice profile** — placeholder `{{ voice_profile_summary }}` (injected at runtime).
3. **Brand tokens** — `{{ brand_tokens_json }}` (injected).
4. **Component catalog** — `{{ component_catalog }}` (auto-generated from the registry).
5. **Non-negotiables** — bullet rules for structure and ethics.
6. **Forbidden** — clichés, dark patterns, invented facts.
7. **Exemplar** — at least one JSON example the model can imitate (ComponentTree or ProposalComponentTree shape).
8. **Output** — “JSON only, no markdown fences.”

## Tone

- Prefer imperative, specific instructions over vague adjectives.
- Call out **when not to invent** (testimonials, metrics, legal claims).

## CI

- Prompt changes should update fixtures under `apps/api/tests/prompts/composers/fixtures/` and keep evaluation tests green.
