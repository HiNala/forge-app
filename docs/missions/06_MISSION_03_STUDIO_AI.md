# MISSION 03 — Studio & AI Orchestration Layer

**Goal:** Build the beating heart of Forge. A user opens Studio, types a prompt, watches a page generate in real time in the preview pane, and can refine it via chat or section-targeted edits. Under the hood, a provider-agnostic LLM orchestration layer routes requests to OpenAI (default), Anthropic, or Gemini, applies a component-library-based page composer for token-efficient output, validates generated HTML before persisting, and streams progress via SSE. After this mission, Forge generates real pages.

**Branch:** `mission-03-studio-ai`
**Prerequisites:** Mission 02 complete. Auth, orgs, brand kits all working. Docs from Mission 00 for OpenAI, Anthropic, Gemini, SSE, and AI orchestration patterns are ready to reference.
**Estimated scope:** Backend-heavy. The orchestration layer is the most technically dense subsystem.

---

## How To Run This Mission

This mission has the highest risk because AI generation is inherently non-deterministic. The goal is not "ship a prompt that works most of the time." The goal is "ship a pipeline that produces consistent, valid, on-brand HTML every time, with graceful fallbacks when the LLM misbehaves."

Read these in order before touching code: `docs/architecture/AI_ORCHESTRATION.md` (from Mission 00), `docs/external/ai/*` (all of them), `docs/external/backend/sse-starlette.md`, `docs/external/frontend/fetch-event-source.md`. Think in terms of the pipeline stages — Intent Parser → Page Composer → Validator → Persist — and the provider router cross-cutting across them.

Commit on milestones: provider abstraction implemented, component library drafted, intent parser working, page composer working end-to-end, SSE wired through to frontend, section editor working, cost tracking in place.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## The Orchestration Architecture (Reference)

```
User prompt
    │
    ▼
┌──────────────────────────┐
│   Tenant Middleware      │   (from Mission 02)
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Studio Endpoint (SSE)  │
│   POST /api/v1/studio/   │
│        generate          │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Intent Parser          │   cheap model, JSON-only output
│   fast model              │   returns {page_type, fields, tone, colors...}
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Page Composer          │   heavy model
│   with Brand Kit +       │   outputs structured HTML built from
│   Component Library       │   the component library
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   HTML Validator         │   AST-parse, check required structure
│   retry once on failure  │   fall back to template if retry fails
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Persist Page +         │   DB write
│   PageRevision           │   + usage accounting
└────────────┬─────────────┘
             │
             ▼
        Stream back to client (SSE chunks)
```

---

## TODO List

### Phase 1 — LLM Provider Abstraction

1. Define `LLMProvider` Protocol in `app/services/ai/base.py` with methods: `chat()`, `stream_chat()`, `estimate_tokens()`. Input shape is OpenAI-compatible `messages=[{role, content}]`. Output shape is our internal `LLMResponse` with text, tool calls, usage stats.
2. Implement `OpenAIProvider` in `openai_provider.py` wrapping the official `openai` SDK. Support streaming with SSE event normalization. Track input/output tokens from the usage field.
3. Implement `AnthropicProvider` in `anthropic_provider.py` wrapping `anthropic` SDK. Map Messages API streaming events (`message_start`, `content_block_delta`, `message_stop`) to our internal event stream. Support prompt caching via `cache_control`.
4. Implement `GeminiProvider` in `gemini_provider.py` wrapping `google-generativeai`. Map streaming events. Handle JSON mode via `response_mime_type`.
5. Implement `LLMRouter` in `router.py`. Given a task (`intent` | `compose` | `section_edit`) and optional provider override, selects the configured model per provider. Route config lives in `config.py`:
    ```python
    LLM_ROUTES = {
        "intent": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0},
        "compose": {"provider": "openai", "model": "gpt-4o", "temperature": 0.3},
        "section_edit": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.2},
    }
    ```
6. Implement fallback chain: if the primary provider fails (rate limit, network), the router retries once with the next provider in the fallback list. Fallbacks configured per route.
7. Implement token + cost tracking. Every LLM call records usage to the current request's `LLMUsageRecord`. On request completion, aggregate and write to `subscription_usage`.
8. Write unit tests for each provider against a mocked SDK (no real API calls in tests). Validate streaming chunk normalization.

### Phase 2 — Component Library & Prompts

The component library is the secret weapon for quality + token efficiency. Rather than letting the LLM invent CSS each time, we give it a library of pre-built, on-brand HTML blocks and instruct it to compose them.

9. Build `app/services/orchestration/components/` — a directory of `.html` snippet files, each a self-contained block:
    - `hero-centered.html`
    - `hero-split.html`
    - `form-vertical.html`
    - `form-inline.html`
    - `cta-bar.html`
    - `features-3col.html`
    - `pricing-3tier.html`
    - `testimonial-single.html`
    - `gallery-grid.html`
    - `menu-list.html`
    - `proposal-cover.html`
    - `proposal-scope.html`
    - `proposal-timeline.html`
    - `proposal-pricing.html`
    - `proposal-accept-decline.html`
    - `footer-minimal.html`
    - `shell-html.html` — the outer HTML document with <head>, CSS variable injection points
10. Each component uses CSS custom properties for brand tokens: `--brand-primary`, `--brand-secondary`, `--brand-bg`, `--brand-text`, `--brand-font-display`, `--brand-font-body`.
11. Each component is fully responsive, accessible, and under 100 lines. These are the design-handoff landing zone — when the designer produces final component designs, they replace these files.
12. Build `app/services/orchestration/prompts/` — system prompts as files:
    - `intent_system.md` — instructs the LLM to parse a user prompt into structured JSON. Includes the schema as an embedded example.
    - `compose_system.md` — instructs the LLM to compose a page using named components from the library. The LLM does NOT generate HTML from scratch; it emits a list of component names + the content/fields for each, and the Page Composer assembles.
    - `section_edit_system.md` — edits a single section while preserving the surrounding structure.
13. Design the Page Composer output schema. The LLM returns:
    ```json
    {
      "theme": {"primary": "#B8272D", "mood": "serious"},
      "sections": [
        {"component": "hero-centered", "props": {"headline": "...", "subhead": "..."}},
        {"component": "form-vertical", "props": {"fields": [...], "submit_label": "Submit"}},
        {"component": "cta-bar", "props": {"text": "...", "phone": "..."}}
      ]
    }
    ```
    The Page Composer then assembles the final HTML by slotting props into component templates. This is the biggest token save — the LLM never re-emits CSS.

### Phase 3 — Intent Parser

14. Implement `IntentParser` service. Takes a user prompt + optional brand kit + optional existing intent (for refinement). Calls the fast model with the `intent_system.md` prompt in JSON mode. Returns a validated `PageIntent` Pydantic model:
    ```python
    class PageIntent(BaseModel):
        page_type: Literal[...]
        title_suggestion: str
        tone: Literal["warm", "formal", "playful", "serious", "minimal"]
        fields: list[FormField] | None  # if it's a form
        sections: list[SectionHint]  # which components to use
        brand_overrides: BrandOverrides | None
    ```
15. If the LLM returns malformed JSON, retry once with a stricter prompt ("respond with ONLY valid JSON, no commentary"). If it fails twice, raise an error to the caller.
16. Unit tests with 20+ prompt examples mapped to expected intents.

### Phase 4 — Page Composer

17. Implement `PageComposer` service. Takes a `PageIntent` + `BrandKit`. Calls the heavy model with `compose_system.md`, the intent, the brand kit, and the list of available components. Requests the LLM return the assembly plan described in Phase 2, Step 13.
18. Implement the `assemble()` method — takes the LLM's plan, loads each component template, fills props, injects CSS variables from the brand kit, and returns the final HTML string.
19. Enforce structural constraints: every booking form page must include a `form-*` component; every proposal must include `proposal-accept-decline`; etc. If the LLM's plan omits a required component, Composer inserts a default.
20. Token budget: track tokens used per compose call. Warn in logs if a single compose exceeds 5000 input or 3000 output tokens — something is wrong.

### Phase 5 — Validator

21. Implement `HTMLValidator` service. Parses output HTML with `lxml` or `html5lib` (tolerant parser). Checks:
    - Outer `<html>` present.
    - `<head>` with `<meta viewport>`.
    - Every `<form>` has an `action` attribute pointing to `/p/{slug}/submit` placeholder.
    - Every `<input>` has a `name`, `required` where the form_schema says required.
    - No external script tags except from allow-listed CDNs.
    - No `style` attribute containing `javascript:` URLs.
22. If validation fails, retry the compose once with validator feedback included in the prompt.
23. If retry fails, fall back to a hand-written template matching `page_type` with the intent's fields slotted in. This path is the safety net — it never fails.

### Phase 6 — Studio SSE Endpoint

24. Implement `POST /api/v1/studio/generate` as an SSE endpoint using FastAPI's `EventSourceResponse` (v0.135+) or `sse-starlette`.
25. Endpoint flow:
    - Emit `event: intent` when intent is parsed.
    - Emit `event: html.start` when composition begins.
    - Stream `event: html.chunk` events as the assembler fills in components (fire one per component, not per character — finer granularity creates too much network overhead).
    - Emit `event: html.complete` with the final `{page_id, slug, url}`.
    - On error, emit `event: error` with `{code, message}` and close the stream.
26. Implement `POST /api/v1/studio/refine` — same pipeline but uses the existing Page's `intent_json` as the base, merges the new user prompt in, re-composes. Persists a new `PageRevision`.
27. Implement `POST /api/v1/studio/sections/edit` — NOT streaming. Takes `page_id`, `section_id`, and `prompt`. Extracts the single section's HTML from the Page's current HTML, sends to the fast model with `section_edit_system.md`, validates the returned section, splices it back into the full HTML, persists a PageRevision, returns the new full HTML. Section IDs are assigned in the Composer as `data-forge-section="hero"`, `data-forge-section="form"`, etc.
28. Implement `GET /api/v1/studio/conversations/{page_id}` and `POST /api/v1/studio/conversations/{page_id}/messages`. Each message is persisted to the `messages` table.
29. Rate limit Studio endpoints: 5 generates/minute per user on trial, 30/minute on Pro. Use the Redis rate limiter from Mission 02.

### Phase 7 — Prompt Caching & Cost Control

30. For the compose step, cache the component library + brand kit portion of the prompt. OpenAI, Anthropic, and Gemini all support prompt prefix caching differently — use each provider's native mechanism in its provider class. Target: 50%+ cache hit rate on repeated generations within the same session.
31. For the section-edit step, cache the surrounding context when the user makes multiple edits in a row.
32. Record cache hits per provider call in the usage tracker.
33. Expose a per-org monthly quota check: if the org has exceeded their plan's page-generation quota, return 402 with a structured `{code: "quota_exceeded", upgrade_url: ...}` response.

### Phase 8 — Frontend Studio UI

34. Build the Studio empty-state and active-state layouts per the design conversation (dark chat feed on left, preview on right in active state; centered input with chips in empty state).
35. Wire the input to `fetchEventSource` against `/api/v1/studio/generate`. Open the SSE connection on submit.
36. Render the preview as an `<iframe srcDoc>` with `sandbox="allow-forms allow-same-origin"`. Update `srcDoc` on each `html.chunk` event.
37. Render chat messages in the feed, animating in with Framer Motion's `AnimatePresence`.
38. After generation completes, show the Page Artifact card in the feed with Open / Save / Email actions, plus the refine chips row.
39. Implement section hover + click: when the user toggles "Edit Mode" in the preview chrome, the iframe registers hover listeners via `postMessage`, and clicking a section opens the floating prompt popup anchored to that section. The popup posts to `/api/v1/studio/sections/edit`.
40. Auto-collapse the sidebar when Studio enters active state (page generated). Persist the collapsed state.
41. Add "Open in new tab" in the preview chrome — opens `/p/{workspace.slug}/{page.slug}?preview=true` in a new tab. Preview mode bypasses the "not published yet" check for authenticated owners.
42. Every preview interaction has a corresponding loading state: dot-pulse in the chat while generating, shimmer in the preview while rebuilding, toast confirmations on success.

### Phase 9 — Integration Tests

43. End-to-end test: user sends prompt, SSE stream completes, Page row exists, HTML validates, preview iframe renders.
44. Test: section edit preserves all other sections byte-for-byte (structural integrity).
45. Test: quota exceeded returns 402 before consuming any tokens.
46. Test: provider fallback fires when primary provider is mocked to fail.
47. Test: malformed LLM output triggers validator retry and eventual template fallback.
48. Load test: 50 concurrent generate requests return successfully within 30s each (streaming).

### Phase 10 — Observability & Wrap

49. Log every LLM call with: provider, model, route name, prompt_tokens, completion_tokens, cost_cents, latency_ms, cache_hit. Log structured to stdout in JSON.
50. Add a Sentry breadcrumb for every pipeline stage.
51. Expose a Grafana-ready Prometheus metric or a simple internal dashboard (`GET /api/v1/admin/llm-stats`) for tokens-per-minute, cost-per-minute, cache hit rate.
52. Update `docs/architecture/AI_ORCHESTRATION.md` with the final implementation details, any deviations from the research doc, and a troubleshooting runbook.
53. Write the mission report.

---

## Acceptance Criteria

- User types a prompt in Studio, sees the preview build progressively via SSE, ends with a valid Page row in the database.
- Section-click edit modifies only the clicked section, verified by a byte-level diff test.
- Provider can be switched to Anthropic or Gemini via env var without code changes.
- Provider fallback fires on primary failure.
- Malformed LLM output is caught by validator and retried or falls back to a template.
- Token usage is recorded accurately and aggregated per org per month.
- Rate limits and quota checks return appropriate error responses.
- All linting, typechecking, tests pass.
- `docker compose up --build` from a clean clone produces a working Studio with OpenAI as the LLM backend.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
