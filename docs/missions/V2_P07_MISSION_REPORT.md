# V2 Mission P-07 — Easy handoff: export pipelines (status)

## Shipped in this pass

- **API router**: `page_export` included in `app/api/v1/__init__.py` (`GET/POST` under `/pages/{page_id}/export…`).
- **Registry**: every workflow in `WORKFLOW_REGISTRY` has a non-empty `export_formats` list aligned to P-07 ids (`html_static`, deck/proposal keys, `waitlist_csv` for `coming_soon`, etc.); `registry_public_dicts()` exposes `export_formats` for future APIs.
- **Export service**: `waitlist_csv` shares the submissions CSV path; **proposal** `pdf_signed` / `pdf_unsigned` return implementable JSON with existing `/v1/pages/.../proposal/pdf` routes; deck `pdf`/`pptx` unchanged (queued).
- **Web**: **five tabs** (Share · Submissions · Automations · Export · Analytics) for all page types; `workflow-config` uses `automationsTabLabel` instead of the old “middle” tab.
- **Export tab**: fetches `getPageExportFormats`, renders unified cards with “What’s in it?”, plan overlay, and `postPageExport` for runs.
- **Tests**: `apps/api/tests/test_p07_export_service.py`.
- **Docs**: `docs/handoff/EXPORT_FORMATS.md`, `docs/handoff/MIGRATION_GUIDES.md`, `docs/architecture/EXPORT_PIPELINE.md`.

## Still roadmap / follow-up (not claimed complete)

- **Adapters** directory with per-file generators for every `implemented=False` catalog entry; **Arq** progress events (`export.progress`, etc.) for long jobs; **30-day** export history + re-download.
- **Quality validators** in CI for PDF/PPTX/zip/next/expo.
- **Admin** failure dashboard metrics; **handoff kit PDF**; **marketing** `/handoff` page content refresh with video/story; **per-slide PNG**, **Keynote**, **WordPress blocks**, **deploy button** gists, etc.

## Verification

- `python -m pytest apps/api/tests/test_p07_export_service.py`
- `pnpm run typecheck` in `apps/web` (client export page + API helpers).
