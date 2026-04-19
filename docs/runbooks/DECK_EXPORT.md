# Deck export runbook (W-03)

## Current behavior

`POST /api/v1/pages/{page_id}/deck/export` with `{ "format": "pptx" | "pdf" | "keynote" | "google_slides" }` enqueues **`deck_export`** on the worker. The stub job updates `decks.last_exported_at` and `decks.last_exported_format`.

## Planned fidelity

- **PDF:** Playwright render of the public deck URL with print CSS (one slide per page). Matches on-screen typography when `media: print` rules are aligned.
- **PPTX:** `python-pptx` mapping from `slides[]` layouts to slide masters; charts via the native chart API; embed speaker notes; fonts shipped with the worker image (Cormorant / Manrope or org substitutes).
- **Google Slides:** Optional path when Google Workspace integration is enabled for the org; batch create + update via API.

## Debugging

1. Confirm **Redis** and **arq** worker are running (`deck_export` appears in `WorkerSettings.functions`).
2. Check API logs for `enqueue_deck_export failed`.
3. Inspect **`decks`** row for `last_exported_at` after job completes.
4. For PDF layout issues, snapshot the same URL with `?notes=true` vs presenter mode and compare print preview.
