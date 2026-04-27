# Export formats (user-facing)

Forge’s export center lives under **Page → Export**. Formats are **workflow-scoped** (from `WORKFLOW_REGISTRY.export_formats`) and **annotated** in `apps/api/app/services/export/catalog.py`.

## How to read this

- **Ready (status: `ready`)** — the API can run the export today (sync file, JSON handoff, or a queued background job where noted).
- **Pro+ (status: `pro_only`)** — visible to everyone; running requires a plan that matches `plan_minimum` on the format.
- **Roadmap (status: `planned`)** — we show the option so you can see what is coming; the API returns a “not implemented” response if invoked directly.

| Category | Formats (ids) | Use when… |
|----------|-----------------|-----------|
| **Stay on Forge** | `hosted` | You want the live URL, SSL, and analytics without managing hosting. |
| **Single file** | `html_static` | You need one `.html` to open locally or place on any static host. |
| **Data** | `submissions_csv`, `waitlist_csv` | You are moving leads to a CRM, ESP, or spreadsheet. |
| **Embed** | `embed_iframe` | You want the page in another site; submissions still hit Forge. |
| **API / migration** | `webhook_snippet` | You are planning automations or a custom backend. |
| **Handoff** | `domain_handoff_txt` | You want a plain checklist of URLs and migration pointers. |
| **Decks** | `pptx`, `pdf` | `pitch_deck` only; large exports are queued. |
| **Proposals** | `pdf_signed`, `pdf_unsigned` | Return API routes / instructions tied to the existing proposal PDF job. |
| **Roadmap (examples)** | `html_zip`, `nextjs_project`, `figma`, `expo_project`, `typeform_json`, `docx`, … | See the in-app copy for each card. |

## Contract

When a format is **ready**, we treat its output as a **versioned contract** for migrations and handoffs. Regressions should fail CI (see `docs/architecture/EXPORT_PIPELINE.md`).
