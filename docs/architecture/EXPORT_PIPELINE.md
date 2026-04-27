# Export pipeline (engineering)

## Overview

- **Catalog**: `app/services/export/catalog.py` — stable format ids, labels, `plan_minimum`, `implemented`, and optional `whats_inside` for the UI.
- **Workflow allow-list**: `app/services/workflows/registry.py` — each `WorkflowDefinition.export_formats` tuple intersects with the catalog.
- **Page → workflow key**: `app/services/export/resolve.py` — maps `Page` to a registry key (fallbacks for legacy types).
- **Service**: `app/services/export/service.py` — `list_formats` (plan + per-page effective implementation, e.g. `pdf` only for `pitch_deck`) and `run` (sync downloads, JSON handoffs, or queue hooks).
- **HTTP**: `app/api/v1/page_export.py` — `GET /pages/{id}/export/formats`, `POST /pages/{id}/export`.
- **Analytics**: `export_initiated` / `export_completed` / `export_failed` via `product_analytics.capture` on run paths.
- **Background jobs**: Deck `pptx` / `pdf` use `enqueue_deck_export` (Arq) where configured.

## Adding a format

1. Add `ExportFormatSpec` to the catalog with a new stable `id`.
2. Reference `id` from the relevant `WorkflowDefinition.export_formats` entries.
3. Implement `run` branch (or return `not_implemented` until ready).
4. Add tests under `apps/api/tests/` and, for binary contracts, a validator (future `tests/exports/quality_validators/`).

## Plan gating

- `_plan_tier` maps org plan to `free` | `pro` | `max`.
- Formats with `plan_minimum` above the tier are **listed** with `status=pro_only` and **blocked** at `run` with `403` when the spec is `implemented=True`.

## Performance & durability

- Large outputs should stay **async** with explicit user messaging (`async_worker=True` in the catalog).
- **Do not** change output shapes for `implemented=True` formats without a version bump and migration notes — exports are product contracts.
