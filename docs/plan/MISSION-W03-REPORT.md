# Mission W-03 — Pitch Deck & Slide Presentation (report)

## Summary

W-03 delivers Forge’s **pitch deck** workflow: structured `decks` rows, narrative frameworks, deterministic slide building + HTML render, public runtime (scroll-snap, Chart.js, analytics hooks), Studio/Page shell actions (Present, Export), and documentation.

## Implemented in repository

| Area | Location / notes |
|------|-------------------|
| DB | `decks` table (`w03_pitch_decks` migration), RLS, `page_type` includes `pitch_deck` |
| Slide schema | `app/schemas/deck_blocks.py` |
| Frameworks | `app/services/orchestration/deck/frameworks.py` — Sequoia, YC, NFX, product launch, internal, all-hands, sales, conference, teaching, BAB, generic + gallery aliases |
| Builder | `app/services/deck_builder.py` — slides from framework + brand-friendly placeholders |
| Composer entrypoint | `app/services/orchestration/deck/composer.py` — documents two-stage flow; currently delegates to builder (LLM Stages A/B can replace incrementally) |
| Studio pipeline | `finalize_deck_studio_html` in `deck_service.py`; orchestration in `pipeline.py` |
| Render | `deck_render.py` — sections, TOC, print CSS, SR chart tables |
| Public runtime | `deck_public_inject.py` — present mode, keyboard nav, fullscreen control, Chart.js, tracking |
| API | `page_deck.py` — GET/PATCH deck, export enqueue |
| Web — Present | `pages/[pageId]/layout.tsx` opens `/p/.../...?mode=present` |
| Web — iframe query fix | `deck-parent-query.ts` + `(public)/p/[org]/[slug]/page.tsx` — forwards `mode`, `notes`, `presenter` into `srcDoc` |
| Templates | Migration seeds 12+ `pitch_deck` gallery rows |
| Tests | `test_w03_deck.py` — frameworks, Pydantic validation, render, inject |
| Runbook | `docs/runbooks/DECK_EXPORT.md` |

## Fixes / additions in this pass

1. **`srcDoc` presenter mode** — Parent query params now injected so `?mode=present` works inside the iframe.
2. **iframe sandbox** — `allow-scripts` added so Chart.js + deck runtime execute.
3. **Runtime** — `chart_type` compat for Chart.js JSON; Backspace / Esc / `?` cheatsheet in present mode; `presenter=true` sets `data-forge-presenter-view` on body.
4. **Composer module** — Documented hook for future LLM Stage A/B.
5. **Docs** — `docs/workflows/PITCH_DECK.md`, this report.

## Remaining (production-hard goals)

- **LLM Stage A/B** in composer (outline vs expand) with batched parallel expand.
- **PPTX/PDF** worker fidelity (`python-pptx`, Playwright PDF), plan enforcement — see worker + billing.
- **Image generation** job `deck_image_generation`, S3, regeneration UI.
- **Studio** thumbnail rail, DnD reorder, per-slide refine chips — partial in product; wire to PATCH deck API.
- **Presenter view** second screen — `?presenter=true` stub only.
- **E2E** — Playwright: full present + export path.
- **Analytics** — heatmaps, export counts in UI — backend events partially there.

## Verification

- API: `uv run pytest apps/api/tests/test_w03_deck.py`
- Web: `pnpm run typecheck` / `vitest` including `deck-parent-query.test.ts`
