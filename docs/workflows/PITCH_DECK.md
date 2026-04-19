# Pitch decks on Forge (W-03)

Forge represents a pitch as a **`pages` row** with `page_type = pitch_deck` and a sibling **`decks`** row (`page_id` PK) holding structured slides (`slides` JSONB), theme tokens, speaker notes map, and export metadata.

## Narrative frameworks

Frameworks live in `app/services/orchestration/deck/frameworks.py`. Each framework is an ordered list of `(layout, role, hint)` used by the deterministic **`build_slides_from_framework`** path to mint slides before any optional LLM refinement. Common keys include `SEQUOIA_PITCH`, `Y_COMBINATOR_PITCH`, `PRODUCT_LAUNCH`, `INTERNAL_STRATEGY`, `GENERIC_10`, etc.

The Studio intent parser maps keywords (e.g. “pitch deck”, “investor deck”, “slides for…”) to `page_type=pitch_deck` and sets `deck_narrative_framework` via **`infer_narrative_framework`**.

## Rendering

`render_deck_html` emits a **single scrollable document** with `scroll-snap-type: y mandatory`, one `<section class="forge-slide">` per slide, `data-forge-slide` + `data-forge-section` for analytics, stable fragment anchors `#slide-N`, and a hidden JSON blob for chart data (no executable `<script>` in stored HTML — `html_validate` compatible). Runtime scripts are injected at **`GET /public/pages`** read time (`deck_public_inject`) for `?mode=present` keyboard navigation and basic `present_*` analytics events.

## Exports

`POST /api/v1/pages/{page_id}/deck/export` enqueues a **`deck_export`** worker job (stub records `last_exported_at`). Full PPTX (`python-pptx`) and PDF (Playwright) fidelity are follow-on work; see `docs/runbooks/DECK_EXPORT.md`.

## Defaults (10/20/30)

Theme JSON carries `min_font_pt: 30`. Composer prompts should encourage one idea per slide and 3–5 bullets—enforced in future LLM stages and Studio editors.
