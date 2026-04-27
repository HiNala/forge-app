# Authoring a new gallery template (P-08+)

1. **Add a row** in `apps/api/app/seed_templates_data.py` to `_RAW` with  
   `(slug, name, description, category, page_type, html_builder_fragment)`.
2. **Call `curated_templates()`** — it wraps your fragment in the shared shell and calls `_form_schema_from_fragment()` so the admin gallery gets reasonable `form_schema` metadata.
3. **Placeholders** in HTML: use `__ORG_SLUG__` and `__PAGE_SLUG__` in form actions — `scripts/seed_templates.py` finalizes to real examples.
4. **Categories** — keep them lowercase kebab; P-08 adds cohort tags like `lead-capture` and `link-hub` for “Coming from {tool}?” filters.
5. **Preview** — optional `is_template_preview` public routes are handled by the hosting layer when the marketing preview path is enabled.

**Tip:** for conversational Typeform-style demos, set `form_schema` `display_mode` to `conversational` in Studio (API patch) after cloning.
