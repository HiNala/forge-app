# V2 Mission P-08 — Competitor parity & templates (report)

## Delivered

### Strategy & docs
- `docs/strategy/COMPETITIVE_AUDIT_2026.md` — 14+ competitors, Match / Reframe / Skip, landscape summary.
- `docs/integrations/MCP_USAGE.md`, `docs/integrations/FIGMA_IMPORT.md`, `docs/templates/TEMPLATE_AUTHORING.md`.

### Parity (Match) — shippable slices
- **Conversational form mode:** `form_schema.display_mode === "conversational"`; `apps/web/public/forge-conversational-form.js` + `apps/api/.../form_public_inject.py` on public page HTML. Schema JSON embedded as `#forge-form-schema`.
- **Conditional logic:** `show_if` on items in `form_schema.fields`; server validation in `form_show_if.py` (tamper + visibility-aware required). Wired into public submit.
- **Pro custom CSS (escape hatch):** `intent_json.custom_css` with sanitization; `html` gets `class="forge-root"` and a `<style>` block (authors scope rules under `.forge-root` per docs). Gated to Pro-like org plans in inject.
- **MCP (HTTP):** `GET/POST /api/mcp/v1/…` in `mcp_v1.py` (manifest + `forge.list_pages` + analytics stub). Same JWT + org header as the REST app.
- **Page API:** `PageDetailOut` includes `form_schema` + `intent_json` + `brand_kit_snapshot`. `PagePatch` shallow-merges `form_schema` and `intent_json`.
- **Publish cache:** `form_schema` and `intent_json` stored in the Redis public-page payload so embed/inject is consistent.
- **Ten new templates** in `seed_templates_data.py` with `P08_TEMPLATE_SLUGS`, inferred `form_schema` from HTML via `_form_schema_from_fragment` for **all** gallery rows (fixes the old “only email” placeholder for every template).
- **Marketing reframe:** hero subline (copy), `DifferentiationSection` on the homepage, `/compare` hub, nav link, sitemap, examples blurb for cohorts.

### Intentional gaps / follow-up
- **Stripe Connect + `payment` field** — not wired in this pass (schema and webhook story remain).
- **Full MCP stdio** and extended tool list — HTTP bridge only; expand per BI-04 token scopes.
- **Figma import implementation** — documented limits only; no binary parser in prod yet.
- **Playwright** conversational tests — not added; unit tests for `show_if` + route registration.
- **Share dialog embed** polish — P-07 export paths; further `/embed` route + postMessage to be unified later.

## Verification
- `python -m pytest apps/api/tests/test_p08_form_show_if.py apps/api/tests/test_p08_mcp_info.py -q`
- `pnpm run typecheck` in `apps/web`
