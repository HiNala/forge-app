# AI Orchestration — Forge

## Pipeline Overview

```
User Prompt
    ↓
┌─────────────────┐
│  Intent Parser   │  (fast model — gpt-4o-mini)
│  Extract type,   │  Input: raw prompt + brand kit
│  fields, tone    │  Output: structured JSON
└────────┬────────┘
         ↓
┌─────────────────┐
│  Page Composer   │  (heavy model — gpt-4o)
│  Generate HTML   │  Input: intent JSON + component library + brand tokens
│  from components │  Output: streaming HTML
└────────┬────────┘
         ↓
┌─────────────────┐
│   Validator      │  (no LLM — AST parser)
│   Check HTML     │  Input: generated HTML
│   structure      │  Output: valid HTML or error
└────────┬────────┘
         ↓
     Save Page
```

## Intent Parser

The Intent Parser runs on the fast model to extract structured data from the user's natural language prompt.

**System prompt:**
```
You are a page intent parser for Forge. Extract the following from the user's prompt:
- page_type: one of booking_form, contact_form, event_rsvp, daily_menu, proposal, landing, gallery, custom
- title: a short title for the page
- fields: list of form fields with name, label, type, required
- tone: the desired copy tone (professional, casual, fun, serious, luxurious)
- brand_overrides: any colors, fonts, or style mentions
- sections: list of page sections the user wants (hero, features, pricing, testimonials, gallery, cta, footer)

Respond in JSON only.
```

**Output example:**
```json
{
  "page_type": "booking_form",
  "title": "Small Jobs Booking",
  "fields": [
    {"name": "name", "label": "Full Name", "type": "text", "required": true},
    {"name": "phone", "label": "Phone Number", "type": "phone", "required": true},
    {"name": "email", "label": "Email Address", "type": "email", "required": true},
    {"name": "description", "label": "Job Description", "type": "textarea", "required": true},
    {"name": "photos", "label": "Upload Photos", "type": "file", "required": false}
  ],
  "tone": "professional",
  "brand_overrides": {"primary": "#B8272D", "secondary": "#1C1C1C"},
  "sections": ["hero", "form", "footer"]
}
```

**Token budget:** ~500 prompt + ~200 completion = ~700 tokens total.

## Page Composer

The Page Composer takes the structured intent and generates a full HTML page.

**System prompt includes:**
1. Role definition: "You generate complete, self-contained HTML pages"
2. Brand kit CSS variables (injected dynamically)
3. Component library reference (a curated list of HTML/CSS blocks)
4. Constraints: mobile-first, < 80KB, no external dependencies, inline CSS only
5. Form submission handler template

**Component Library** (referenced, not included in full — the LLM composes from these):
- `hero-centered` — centered headline + subtitle + optional background
- `hero-split` — image left, text right
- `form-vertical` — stacked form fields
- `form-inline` — side-by-side fields
- `cta-bar` — call-to-action strip
- `pricing-3col` — three-column pricing
- `testimonial-card` — quote with attribution
- `gallery-grid` — responsive image grid
- `menu-list` — name + description + price
- `proposal-section` — numbered section with details
- `footer-simple` — logo + copyright

**Token budget:** ~2500 prompt + ~3000 completion = ~5500 tokens total.

## Section Editor

For section-targeted edits, we send ONLY the section HTML + the user's instruction.

**System prompt:**
```
You edit a single section of an HTML page. You receive the current HTML of one section
and a user instruction. Return ONLY the modified section HTML. Do not change the
surrounding structure. Preserve all class names and data attributes.
```

**Token budget:** ~400 prompt + ~400 completion = ~800 tokens total.

## Validator

The Validator is NOT an LLM call. It's a Python HTML parser that checks:

1. HTML is well-formed (parseable by `html.parser`)
2. If page_type involves a form: a `<form>` element exists
3. All form fields from the schema are present
4. No `<script>` tags except the submission handler
5. CSS is inline (no external stylesheet links)
6. No external resource loading (fonts from allow-listed CDNs are OK)

If validation fails, the pipeline retries once with a stricter prompt ("The HTML you generated was malformed. Please fix:..."). If retry fails, fall back to a template-based page matching the detected intent.

## Fallback Chain

```
Primary (OpenAI gpt-4o)
    ↓ (on failure)
Secondary (Anthropic Claude Opus)
    ↓ (on failure)
Tertiary (Google Gemini Pro)
    ↓ (on failure)
Template fallback (no LLM — pre-built HTML matching intent)
```

## Observability

Every LLM call logs:
- Provider + model
- Prompt tokens + completion tokens
- Latency (ms)
- Success/failure
- Organization ID (for per-tenant cost tracking)

These feed the `subscription_usage` table and Sentry/PostHog for operational visibility.

## Cost Projections

| User Tier | Monthly Pages | Monthly Edits | Est. LLM Cost |
|-----------|--------------|--------------|---------------|
| Free | 1 | 5 | $0.035 |
| Starter | 5 | 25 | $0.175 |
| Pro | 20 | 100 | $0.70 |

Well within the PRD target of < $0.50/tenant/month for free-tier users.
