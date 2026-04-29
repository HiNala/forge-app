# Export launch matrix (AL-03)

| Format | Launch status | Decision |
|--------|---------------|-----------|
| `html_static` | working | Ship at launch |
| `hosted` | working | Ship at launch |
| `embed_iframe` | working | Ship at launch |
| `webhook_snippet` | working | Ship at launch |
| `domain_handoff_txt` | working | Ship at launch |
| `submissions_csv` | working | Ship at launch |
| Deck `pdf` / `pptx` via worker | partial (queued) | Ship with queue UX |
| `pdf_signed` / `pdf_unsigned` (proposal) | working | Ship for proposal workflows |
| `figma`, `expo_project`, multi-page `html_zip`, Framer/Webflow imports, DOCX/Google exports, `qr_png`, Survey JSON clones | not_started | Hide in UI (`hidden_in_ui` + tightened workflow registries) |

Source of truth: `apps/api/app/services/export/catalog.py` (`ExportFormatSpec.hidden_in_ui`), `WorkflowDefinition.export_formats` in `apps/api/app/services/workflows/registry.py`.
