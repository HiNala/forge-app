# Canvas-aware orchestration (V2 P-05)

## Scope hierarchy

`ScopeLevel` (`region` → `element` → `section` → `screen` → `flow` → `project`) is the shared vocabulary for all workflows (forms, proposals, decks, mobile canvas, web canvas, websites). See `app/services/orchestration/scope.py`.

- **Region / element / section** — local HTML edits; region pipeline uses pre/post fingerprints (`region_hash.py`) to detect drift outside the marquee.
- **Screen** — one mobile screen or one web page.
- **Flow** — multi-screen or multi-page; consistency checks from mobile/web canvas missions apply.
- **Project** — site-wide rebrand or voice change; use `project_wide.py` consent + rate-limited fan-out (max parallel enforced at execution layer).

## Multi-modal context

`ContextBundle.vision_inputs` holds `VisionInput` rows (S3 `storage_key`, mime, optional `extracted_features`). Studio registers uploads via `POST /api/v1/studio/attachments/presign` and `.../register`; generation passes `vision_attachment_ids` on generate/refine. The bundle’s `to_prompt_context()` appends a **vision** section for the composer. Providers with vision get images in the API call in a later iteration; text-only fallbacks use OCR + features in the prompt today.

## Clarify flow

Structured payloads for extended clarify types live in `clarify_payloads.py` (workflow, scope, breakpoint, reference). SSE `clarify` remains non-blocking; UI chips map to `ClarifyPayload`.

## Plan mode

`plan_mode.PlanDraft` is the DTO for editable multi-step plans; execution is wired incrementally.

## Related

- `docs/architecture/WEB_CANVAS.md`, mobile canvas docs
- `docs/billing/PRICING_MODEL.md` — credit charges per scope
