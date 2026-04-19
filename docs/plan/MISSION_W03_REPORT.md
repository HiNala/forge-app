# Mission W-03 — Pitch Deck & Slide Presentation (report)

**Branch:** `mission-w03-pitch-deck`  
**Status (2026-04-18):** Backend foundation shipped: **`decks` table** + RLS, **12 gallery rows** in `templates`, **narrative frameworks** module, **deterministic slide builder**, **scroll-snap HTML renderer**, Studio pipeline integration, **REST** `GET/PATCH /pages/{id}/deck` and **`POST .../deck/export`**, **worker stub** `deck_export`, **public inject** for `pitch_deck` pages, **analytics event** allow-list extended for `present_*`, and **tests** for frameworks/build/render.

## Shipped

| Area | Notes |
|------|--------|
| Data model | `decks` (JSON slides, theme, notes, transitions, lock + export fields), `down_revision=w02_contractor_proposals`. |
| Frameworks | `SEQUOIA_PITCH`, `Y_COMBINATOR_PITCH`, `NFX_PITCH`, `PRODUCT_LAUNCH`, `INTERNAL_STRATEGY`, `ALL_HANDS`, `SALES_PITCH`, `CONFERENCE_TALK`, `TEACHING_LECTURE`, `BEFORE_AFTER_BRIDGE`, `GENERIC_10`, plus gallery alias frameworks (`INVESTOR_CLASSIC_10`, `SEED_INVESTOR`, `QBR_ROADMAP`, `SALES_ENTERPRISE`, etc.). |
| Intent | Keywords → `pitch_deck` + `infer_deck_kind` / `infer_narrative_framework` when LLM intent JSON fails. |
| Render | Web-native vertical deck; **no `<script>` in DB**; chart data in hidden `<pre>` JSON. |
| Present mode | Injected client script reads `?mode=present` / `?notes=true`; posts `present_started` / `present_slide_viewed` / `present_ended` (minimal). |
| Export | API + queue + worker metadata only. |

## Not complete (explicit)

- **DeckComposer** two-stage LLM (outline + parallel expand) — only deterministic builder exists.
- **Studio / Next.js** thumbnail rail, drag reorder, chart spreadsheet editor, image regen, “Generate speaker notes”.
- **Framer Motion** transitions; **presenter view** second window; **fullscreen** polish and `?` cheatsheet.
- **Chart.js** (or similar) client draw from JSON in production bundle — inject is minimal navigation only.
- **Image generation** job `deck_image_generation`, S3, progressive shimmer.
- **PPTX/PDF/Google** real export; **plan-gated** export matrix; **audit_log** on export.
- **Collaboration lock** UI + 10‑minute timeout; **version restore** with `deck_edit` only partially via `PageRevision`.
- **E2E** Playwright demo; **visual** PDF regression; **python-pptx** round-trip test.
- **Per-slide analytics** dashboards in Page Detail.

## Verify

```bash
cd apps/api && uv run pytest tests/test_w03_deck.py -q
cd apps/api && uv run alembic upgrade head
```
