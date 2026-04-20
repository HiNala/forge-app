# Pitch deck workflow (W-03)

## What you get

Forge builds **web-native** pitch decks: one scrollable URL that doubles as a presentation. The primary experience is the browser (responsive, shareable, versioned). PPTX/PDF exports are optional conveniences.

## Narrative frameworks

Each deck follows a **framework** — an ordered list of slide *slots* (layout + role + content hint). Frameworks live in `apps/api/app/services/orchestration/deck/frameworks.py` (`FRAMEWORKS`, `SEQUOIA_PITCH`, `Y_COMBINATOR_PITCH`, `GENERIC_10`, gallery aliases such as `INVESTOR_CLASSIC_10`, `QBR_ROADMAP`, etc.). The intent layer picks a framework from the user prompt; Studio can switch frameworks later via PATCH.

Slides use stable **`slide_*` IDs** (not index) so reordering and per-slide edits survive updates.

## Slide schema

Structured slides are stored in `decks.slides` (JSONB) and validated with Pydantic (`apps/api/app/schemas/deck_blocks.py`): layouts (`title_cover`, `bullet_list`, `chart`, …), optional `chart`, `image`, `quote`, `metrics`, `speaker_notes`, etc.

## Rendering & presenter mode

- **Scroll:** `render_deck_html` emits `<section data-forge-slide="…">` with scroll-snap CSS.
- **Public URL:** live pages are served at `/p/{org_slug}/{page_slug}`.
- **Presenter mode:** open **`?mode=present`** (e.g. from **Present** on the page shell). Arrow keys / Space advance; Backspace / ← go back; Esc exits fullscreen; **`?`** or **Shift+/** shows a shortcuts alert.
- **Speaker notes:** `?notes=true` surfaces notes. **`?presenter=true`** sets a flag for future presenter-view layouts.

Because decks may load in an **iframe** (`srcDoc`), query strings on the parent page can be injected as `window.__FORGE_PARENT_SEARCH__` via `apps/web/src/lib/deck-parent-query.ts` so the runtime sees `mode=present` correctly.

## Charts & placeholders

Chart slides serialize `ChartBlock` (`chart_type`, `labels`, `series`, `is_placeholder`, `source_hint`). The public runtime loads Chart.js from CDN and renders from JSON next to each `<canvas>`. A screen-reader table mirrors the numbers (`forge-chart-sr-only`).

## Analytics

In presenter mode, the injected script posts analytics-compatible events to the public track endpoint when configured, including:

- **`present_start`** — presenter mode engaged (slide count in metadata).
- **`present_slide_view`** — when a slide becomes current (index + id).
- **`present_end`** — on exit, tab hide, or unload.

Scroll-mode readers use the generic engagement pipeline (`deck_view`, `slide_view`, `slide_dwell`).

## API

- **`GET/PATCH /api/v1/pages/{page_id}/deck`** — load or update slides, theme, notes; PATCH re-renders `pages.current_html` and appends a **`deck_edit`** `page_revisions` row.
- **`POST /api/v1/pages/{page_id}/deck/export`** — enqueue export (see runbook).

## Verification

From `apps/api` (PostgreSQL required for the integration test):

```bash
uv run pytest tests/test_w03_deck.py tests/test_w03_deck_integration.py tests/test_w03_intent_deck.py -q
```

## Further reading

- `docs/runbooks/DECK_EXPORT.md` — worker stub, planned PPTX/PDF/Google paths.
- `docs/plan/MISSION_W03_REPORT.md` — mission status and gaps.
