# Mission W-03 — Pitch Deck & Slide Presentation (report)

**Branch:** `mission-w03-pitch-deck`  
**Status (2026-04-20):** Backend foundation, frameworks, deterministic builder, scroll-snap + Chart.js public runtime, presenter keyboard navigation, deck API + revision snapshots, worker export metadata stub, and **automated tests** for frameworks, render shape, intent fallback, and HTTP+DB flows. Large Studio/Next.js features and production-grade exports remain follow-ons.

## Shipped

| Area | Notes |
|------|--------|
| Data model | `decks` (JSON slides, theme, speaker_notes, transitions, lock + export fields), RLS; `page_type=pitch_deck`. |
| Frameworks | `SEQUOIA_PITCH`, `Y_COMBINATOR_PITCH`, `NFX_PITCH`, `PRODUCT_LAUNCH`, `INTERNAL_STRATEGY`, `ALL_HANDS`, `SALES_PITCH`, `CONFERENCE_TALK`, `TEACHING_LECTURE`, `BEFORE_AFTER_BRIDGE`, `GENERIC_10`, plus gallery aliases (`INVESTOR_CLASSIC_10`, `SEED_INVESTOR`, `QBR_ROADMAP`, `SALES_ENTERPRISE`, …). |
| Builder | `build_slides_from_framework` — deterministic slides with placeholders, chart blocks, team/quote/image hooks. |
| Intent | Keywords → `pitch_deck`; `infer_deck_kind` / `infer_narrative_framework` on LLM fallback. |
| Render | `render_deck_html` — `data-forge-slide`, scroll-snap, slide numbers, a11y regions. |
| Public inject | Present mode, hash `#slide-N`, Chart.js from CDN, **`present_start`** / **`present_slide_view`** / **`present_end`** tracking (aligned with analytics migration), fullscreen + UI chrome. |
| API | `GET/PATCH /pages/{id}/deck`, `POST .../deck/export` → queue; PATCH creates `PageRevision` with `edit_type=deck_edit`. |
| Worker | `deck_export` updates `last_exported_at` / `last_exported_format` (no binary file yet). |
| Templates | Migration seeds **12+** `pitch_deck` gallery rows. |

## Verified (automated)

```bash
cd apps/api
uv run pytest tests/test_w03_deck.py tests/test_w03_deck_integration.py tests/test_w03_intent_deck.py -q
```

Integration test requires PostgreSQL (`DATABASE_URL`).

| Test file | Covers |
|-----------|--------|
| `test_w03_deck.py` | Framework sizes, Pydantic validation, YC inference, chart SR table, inject markers, scroll-snap HTML, layout/role alignment vs framework, single-slide edit isolation |
| `test_w03_deck_integration.py` | GET deck, PATCH one slide + preserves others, export queued, `deck_edit` revision |
| `test_w03_intent_deck.py` | Heuristic `pitch_deck` + `investor_pitch` when LLM disabled |

## Not complete (explicit follow-on)

- **DeckComposer** two-stage LLM (outline + parallel expand) — `compose_deck_slides` still wraps the deterministic builder.
- **Studio / Next.js** thumbnail rail, drag reorder, chart spreadsheet editor, image regen/upload, “Generate speaker notes”, refine chips UI.
- **Framer Motion** transitions; dedicated **presenter view** second window; cheatsheet modal instead of `alert`.
- **Image job** `deck_image_generation`, S3, progressive shimmer.
- **PPTX/PDF/Google** binary export; **plan-gated** matrix; **audit_log** on export.
- **Collaboration lock** UI + 10‑minute timeout (columns exist).
- **Per-slide analytics** dashboards in Page Detail UI.
- **E2E** Playwright; **visual** PDF regression; **python-pptx** round-trip test once export produces bytes.

## Docs

- `docs/workflows/PITCH_DECK.md` — concepts, URLs, analytics event names, verification.
- `docs/runbooks/DECK_EXPORT.md` — worker debugging, planned fidelity.

## Risks / notes

- Chart.js is loaded from a CDN on the public page — ensure CSP allows `cdn.jsdelivr.net` if you tighten headers.
- Analytics pipeline uses **`present_start`** (not `present_started`) per engagement migration.
