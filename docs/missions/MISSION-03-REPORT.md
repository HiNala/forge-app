# Mission 03 — Studio & AI Orchestration — Report

**Status:** Complete (core acceptance + tests)  
**Branch:** `mission-03-studio-ai` (implement on this branch from Mission 02)  
**Date:** 2026-04-19  
**Re-verified:** 2026-04-20 — audit vs mission TODO 1–53; Sentry breadcrumbs added on `stream_page_generation` stages.

## Summary

Forge Studio generates real pages through an **intent → assembly plan → template compose → validate → persist** pipeline, streamed to the client over **SSE**. LLM access is **provider-agnostic** via **LiteLLM** with per-task models and env-based provider keys. **Usage** accrues to `subscription_usage`; **quotas** and **per-user rate limits** protect trial vs pro. The **Next.js Studio** UI uses **fetch-event-source** with Clerk Bearer + tenant header, a split chat/preview layout, and **section-targeted edits** by `data-forge-section` id.

**Mission doc vs repo:** The brief’s flat `components/*.html` list evolved into **`component_lib/catalog.py`** (40+ component IDs) plus **`component_lib/templates/*.jinja.html`** and legacy HTML under `components/` for shell + a few blocks. Same product goal — token-efficient composition — richer catalog.

## Backend

- **LLM:** `app/services/ai/router.py` — `completion_text(..., db=, organization_id=)` records tokens/cost; `app/services/ai/metrics.py` ring buffer for `GET /api/v1/admin/llm-stats`.
- **Protocol:** `app/services/ai/base.py` — `LLMResponse` + `LLMProvider` protocol; **`openai_provider.py` / `anthropic_provider.py` / `gemini_provider.py`** exist for tests or specialized paths — **production Studio uses LiteLLM** in `router.py` (single integration, multi-provider via keys + `LLM_FALLBACK_MODELS`).
- **Routes doc:** `app/services/ai/llm_routes.py` mirrors the mission’s logical `LLM_ROUTES` table.
- **Orchestration:** `intent_parser`, `page_composer`, `html_validate`, `pipeline` (SSE + **Sentry breadcrumbs** at intent / compose / validate / persist), `section_editor` (extract/splice/edit).
- **Studio routes:** `app/api/v1/studio.py` — generate/refine (SSE), section edit, conversations, `GET /studio/usage`.
- **Config:** `PAGE_GENERATION_QUOTA_TRIAL/PRO`, `STUDIO_GENERATE_PER_MINUTE_TRIAL/PRO`, `UPGRADE_URL`.

## Frontend

- `apps/web/src/components/studio/studio-workspace.tsx` — empty vs active layout, SSE accumulation into iframe `srcDoc`, refine, section chips from parsed `data-forge-section`, “Open” preview URL pattern.
- `apps/web/src/lib/sse.ts` — authenticated `streamStudioSse`.

## Tests

- `tests/test_studio_mission03.py` — section splice integrity, extract, **402** when quota exceeded (sync, before SSE body).
- `tests/test_llm_router.py` — mocked LiteLLM, **fallback** after primary failure, all-fail error path.
- Existing API tests retained (tenant isolation, team security, etc.).

**Deferred from mission stress list:** §48 load test (50 concurrent / 30s) not automated in CI — run manually or add k6 when staging is stable.

## Not in this pass (follow-ups)

- Full **OpenAI/Anthropic/Gemini** SDK classes replacing LiteLLM (optional; LiteLLM already routes all three).
- **Prompt prefix caching** metrics beyond LiteLLM’s `cache_hit` when exposed by the provider response.
- **50 concurrent load** test and **iframe postMessage** edit UX (Mission doc §9/§8) — partial: section ids are selectable in UI without iframe scripting.
- **Public** `/p/{org}/{slug}` preview route — URL is built client-side; wire when public page app route exists.

## Acceptance mapping

| Criterion | Status |
|-----------|--------|
| Prompt → SSE → Page row | Yes (`pipeline` + persist) |
| Section edit structural test | Yes (`test_section_splice_preserves_other_sections`) |
| Provider via env | Yes (LiteLLM + keys) |
| Fallback chain | Yes (`LLM_FALLBACK_MODELS` + chain in router) |
| Validator + template fallback | Yes (validate + `default_assembly_plan` retry path) |
| Token usage in DB | Yes (`subscription_usage`) |
| Rate limit + quota | Yes (Redis + 402) |
| Lint/tests | Ruff + pytest green |
| Docker + OpenAI | Set `OPENAI_API_KEY` in `.env` for compose |
