# ORCHESTRATION MISSION O-01 — Provider Abstraction & Context Gathering

**Goal:** Build the first layer of Forge's AI brain — the part that hears "I want a contact page for my business forgecoffee.com in my brand styles" and, before an LLM ever writes a single `<div>`, knows the business's logo, colors, fonts, voice, existing messaging, and visual style. This mission builds (1) a provider-agnostic LLM adapter supporting OpenAI, Anthropic, and Gemini with streaming, tool-use, and structured outputs; and (2) an asynchronous context gathering pipeline that pulls everything the downstream agents will need — brand extraction, business research, tone analysis, calendar context, user history — in parallel, with 3-second hard budgets, so the user gets a designed page back before being asked a single clarifying question.

**Branch:** `mission-o01-provider-context`
**Prerequisites:** Backend Infra BI-01 through BI-04 complete. The `integrations` table, presigned-URL uploads, and background worker are all operational. Env vars for OpenAI, Anthropic, and Gemini are set.
**Estimated scope:** Large. The provider abstraction is small but precise; context gathering has many parallel tracks, each with caching and fallback. This mission is load-bearing for every mission after.

---

## Experts Consulted On This Mission

- **Ken Thompson / Dennis Ritchie** — *Small composable adapters. The provider layer should do one thing well — normalize an API.*
- **Linus Torvalds** — *Under real-world conditions (an LLM API goes down, a website is slow, a user's connection stalls mid-stream), does this degrade gracefully?*
- **Alan Kay** — *Is this a new medium? Context gathering isn't RAG — it's the model understanding a business before it writes for that business.*
- **Bill Atkinson** — *Does the user feel the machine thinking? Or does they just see "loading…"?*

---

## How To Run This Mission

The guiding principle, straight from the user brief: **give output before asking questions.** Even if Forge has 12 unanswered clarifications, it shows a drafted page first. Context gathering exists to make that first draft as close to right as possible by pre-loading everything the agents might need.

Read `docs/external/ai/provider-apis.md` (OpenAI, Anthropic, Gemini SDKs from Mission 00). Read `docs/external/ai/brand-extraction.md` (Firecrawl, Brand.dev, or self-hosted extraction via Playwright). Read the 2026 LLM research on structured outputs — Pydantic AI and Instructor are the Python leaders, `response_format` with Pydantic on OpenAI is the simplest reliable path.

Commit on milestones: provider adapter with all three providers, streaming normalization, structured output pattern, context gatherer with URL extraction, business research, voice inference, caching layer, tests passing.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Provider Abstraction

1. Create `apps/api/app/services/llm/provider.py` — a typed protocol with three implementations:
    ```python
    class LLMProvider(Protocol):
        name: ProviderName  # 'openai' | 'anthropic' | 'gemini'
        
        async def complete(
            self,
            messages: list[Message],
            *,
            model: str,
            temperature: float = 0.7,
            max_tokens: int = 4096,
            response_schema: type[BaseModel] | None = None,
            tools: list[ToolDef] | None = None,
            stream: bool = False,
            stop: list[str] | None = None,
            timeout_seconds: float = 60.0,
            system_prompt: str | None = None,
        ) -> CompletionResult | AsyncIterator[CompletionChunk]: ...
    ```
2. Implement `OpenAIProvider` using the official `openai` SDK (AsyncOpenAI client). Map the unified `Message` schema to Chat Completions or Responses API. Use `response_format={"type": "json_schema", "json_schema": {...}}` for structured output — guaranteed schema compliance per OpenAI's 2024+ Structured Outputs feature.
3. Implement `AnthropicProvider` using the official `anthropic` SDK. Use the `tools` API for structured output (Claude doesn't have a dedicated JSON mode — you pass a tool with the schema and the model "calls" it). Normalize Anthropic's `content_block_delta` events during streaming to match the unified chunk format.
4. Implement `GeminiProvider` using `google-genai`. Use `response_schema` for structured output. Handle Gemini's multimodal support as a bonus (future missions will use image inputs for brand kit extraction from uploaded screenshots).
5. All three providers emit a **unified chunk schema** during streaming:
    ```python
    class CompletionChunk(BaseModel):
        kind: Literal['text', 'tool_call_start', 'tool_call_delta', 'tool_call_end', 'finish', 'error']
        text: str | None = None
        tool_call: ToolCallDelta | None = None
        finish_reason: Literal['stop','length','tool_use','content_filter','error'] | None = None
        input_tokens: int | None = None
        output_tokens: int | None = None
    ```
6. All three providers normalize usage reporting. The `CompletionResult` (non-streaming) and final `finish` chunk (streaming) both carry `{input_tokens, output_tokens, cost_cents}`. Per-model costs are defined in `app/services/llm/pricing.py` (static table, updated quarterly with a cron alert to revisit).

### Phase 2 — Provider Router & Fallback

7. Create `LLMRouter` — the class the rest of the app calls. Takes a *role* (e.g., `intent_parser`, `composer`, `section_editor`, `voice_inferrer`) and picks the right provider + model for that role based on config:
    ```python
    @dataclass
    class ModelRoute:
        role: str
        primary: tuple[ProviderName, str]  # (provider, model)
        fallbacks: list[tuple[ProviderName, str]]  # ordered fallback chain
        temperature: float
        max_tokens: int
        
    ROUTES = {
        'intent_parser': ModelRoute(
            role='intent_parser',
            primary=('openai', 'gpt-4o-mini'),  # fast, cheap, structured-output-reliable
            fallbacks=[('anthropic', 'claude-haiku-4-5-20251001'), ('gemini', 'gemini-2.5-flash')],
            temperature=0.2,
            max_tokens=2000,
        ),
        'composer': ModelRoute(
            role='composer',
            primary=('openai', 'gpt-4o'),  # heavy tier
            fallbacks=[('anthropic', 'claude-opus-4-6'), ('gemini', 'gemini-2.5-pro')],
            temperature=0.6,
            max_tokens=8000,
        ),
        'section_editor': ModelRoute(
            role='section_editor',
            primary=('openai', 'gpt-4o-mini'),  # fast tier
            fallbacks=[('anthropic', 'claude-haiku-4-5-20251001'), ('gemini', 'gemini-2.5-flash')],
            temperature=0.5,
            max_tokens=2000,
        ),
        # ... more roles
    }
    ```
8. Fallback behavior: on primary provider failure (timeout, rate limit, 5xx), retry the same provider once with backoff; on second failure, try the next in the fallback chain. Log the switch with metrics (`llm.fallback.triggered` counter). If all providers fail, raise `DependencyError`.
9. Per-org override: an org can configure a preferred provider in settings (for data-residency or contractual reasons). The router respects the override but keeps the same fallback chain.
10. Per-session override: the Studio UI lets the user pick a provider for the current session (F-04). This overrides the route's primary.
11. Budget awareness: before calling, the router checks `usage_counters` for the org's AI spend this month. If over the plan's soft limit, route to cheaper models or refuse with `QuotaExceeded`. Hard limit enforced by BI-03's `BillingGate`.

### Phase 3 — Structured Output Discipline

12. Every agent call that expects structured data goes through a Pydantic model. No free-form JSON parsing. The pattern:
    ```python
    class PageIntent(BaseModel):
        """What the user wants to build."""
        workflow: Literal['contact_form', 'proposal', 'pitch_deck', 'landing', 'menu', 'other']
        page_type: PageType
        title_hint: str
        confidence: float = Field(ge=0, le=1, description="The parser's confidence in this workflow classification")
        # ...
    
    result = await llm_router.structured_completion(
        role='intent_parser',
        system_prompt=INTENT_PARSER_SYSTEM,
        user_prompt=prompt,
        schema=PageIntent,
    )
    # result is a PageIntent instance, validated
    ```
13. On structured output validation failure (should be rare with strict mode but possible), retry once with the validation error appended to the prompt as "Your previous response failed validation: {error}. Return again following the schema exactly." If the second attempt fails, raise `LLMSchemaError`.
14. All schemas live in `app/services/llm/schemas/` organized by role (intent, compose, refine, review, etc.). Every field has a `description` — these get passed to the model as formatting hints.
15. Streaming structured output: OpenAI and Gemini both support this; Anthropic via tool-streaming. Implement a `structured_stream()` method that yields partial-but-validated objects (handy for surfacing title/subtitle early while body continues to stream).

### Phase 4 — Prompt Library

16. Every system prompt for every role lives in `app/services/llm/prompts/` as a versioned markdown file: `intent_parser.v1.md`, `composer.v1.md`, `section_editor.v1.md`, etc.
17. Prompts are loaded at module import time and hot-reloadable in dev. Production pins prompt versions — a Pydantic `PROMPT_VERSIONS` registry maps role → version. Upgrading a prompt is a two-step deploy: ship v2 alongside v1, shadow-test, then switch the registry.
18. Prompts interpolate runtime context via simple `{{ variable }}` tokens — we're not embedding code, just string substitution. Full-featured templating would be overkill.
19. Include an evaluation harness: for each prompt, a small JSON fixture file of `{input, expected_output}` cases under `apps/api/tests/prompts/`. A CI test runs each case against the prompt with temperature 0, asserts the output matches (structural equality for structured outputs, semantic similarity for free text). Changes to a prompt fail CI until fixtures are updated — forces prompt changes through review.
20. The system prompts for the expert-designer agents (built in O-02, O-03, O-04) are initialized in this mission with stub content; the full personas are crafted in those missions.

### Phase 5 — Context Gathering Pipeline (The Core of This Mission)

21. Create `app/services/context/gather.py` — the orchestrator called at the very start of every Studio generate request. It spawns parallel async tasks:
    ```python
    async def gather_context(prompt: str, org: Organization, user: User, *, time_budget_seconds: float = 3.0) -> ContextBundle:
        """Gather everything the downstream agents might need. Time-bounded."""
        tasks = {
            'brand_kit':       asyncio.create_task(load_brand_kit(org.id)),
            'prompt_urls':     asyncio.create_task(extract_urls_from_prompt(prompt)),
            'recent_pages':    asyncio.create_task(load_recent_pages(org.id, limit=5)),
            'org_templates':   asyncio.create_task(load_org_proposal_templates(org.id, limit=3)),
            'user_voice':      asyncio.create_task(load_user_voice_preferences(user.id)),
            'calendars':       asyncio.create_task(load_calendars_summary(org.id)),
        }
        # Wait for all with the hard time budget
        results = await wait_with_budget(tasks, time_budget_seconds)
        # URLs found in prompt trigger secondary tasks (website fetch, brand extraction)
        if results.get('prompt_urls'):
            sub_tasks = {
                'site_brand':    asyncio.create_task(extract_site_brand(results['prompt_urls'][0])),
                'site_voice':    asyncio.create_task(extract_site_voice(results['prompt_urls'][0])),
                'site_products': asyncio.create_task(extract_site_products(results['prompt_urls'][0])),
            }
            # Secondary budget — another 2 seconds on top
            sub_results = await wait_with_budget(sub_tasks, 2.0)
            results.update(sub_results)
        return ContextBundle(**results)
    ```
22. `wait_with_budget` is the critical primitive. It runs `asyncio.gather(*tasks, return_exceptions=True)` inside `asyncio.wait_for(timeout=budget)`. Tasks that complete are used; tasks still running at timeout are cancelled and marked in the bundle as `{status: 'timeout', partial: None}`. The bundle is always returned — never blocks on a slow task.
23. Each gather task is itself wrapped with a per-task timeout (shorter than the outer budget) so a single hung task can't consume the whole budget.
24. The bundle is passed to downstream agents. Agents check `bundle.has('site_brand')` before using it. Missing context is never an error — the downstream prompt adapts ("Since we don't know your brand colors, we'll use warm teal defaults — update anytime").

### Phase 6 — URL Extraction

25. The first gather task parses the user's prompt for URLs. Simple regex for `https?://[^\s]+`. If none in prompt, check:
    - The org's brand_kit.logo_url's domain (hint, e.g., if they uploaded a logo from nike.com, maybe nike.com).
    - The user's email domain (weak signal).
    - A `website_url` field in org settings (added in this mission).
26. If multiple URLs in prompt, use the first (user's intent is usually primary). Log the others for potential follow-up.

### Phase 7 — Site Brand Extraction

27. `extract_site_brand(url)` — fetches the site and extracts:
    - Primary and secondary colors (detected from CSS variables, meta theme-color, logo).
    - Display and body fonts (parsed from loaded `@font-face` rules or computed styles).
    - Logo URL (og:image, favicon, `<link rel="apple-touch-icon">`).
    - Business name (og:site_name, title tag, schema.org markup).
    - Brief tagline (meta description, hero h1).
28. Implementation strategies, in priority order:
    - **Primary:** integrate a third-party API like Brand.dev or Firecrawl's branding endpoint. Single HTTP call returns structured JSON. Cached aggressively.
    - **Fallback:** self-hosted extraction via a worker job that uses Playwright to load the site, then extracts from the rendered DOM + computed styles. Slower (~2-4s) but zero external deps.
    - Cache results for 24 hours in Redis keyed by URL hash. A re-generation the next day hits the same cache.
29. Abort any extraction that takes longer than the inner budget — partial results are OK. The composer will simply not have that context.
30. Respect `robots.txt` for ethical crawling. Log and skip on disallow.
31. Store successful extractions under `site_brand_cache` table for long-term memory and to avoid repeated expensive calls:
    ```sql
    CREATE TABLE site_brand_cache (
      url_hash TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      data JSONB NOT NULL,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ttl_seconds INT NOT NULL DEFAULT 86400
    );
    ```
    Not tenant-scoped — brand info is public. No RLS.

### Phase 8 — Site Voice Extraction

32. `extract_site_voice(url)` — fetches 3-5 content pages from the site (homepage, about, services) and runs a fast-tier LLM call to infer:
    - **Tone**: formal, casual, playful, technical, warm, corporate.
    - **Voice attributes**: first-person / third-person, active / passive, short sentences / long sentences.
    - **Brand personality**: "no-nonsense, local contractor" or "playful DTC startup" or "enterprise SaaS".
    - **Vocabulary samples**: 5-10 phrases the brand uses repeatedly (e.g., "hand-crafted", "family-owned since 1987").
33. The output is a `VoiceProfile` Pydantic model:
    ```python
    class VoiceProfile(BaseModel):
        tone: Literal['formal','casual','playful','technical','warm','corporate','edgy','academic']
        formality: Literal['low','medium','high']
        persona_summary: str  # one sentence the composer can paste into its system prompt
        signature_phrases: list[str] = []
        avoid_phrases: list[str] = []
        readability_target: Literal['grade_5','grade_8','grade_12','grade_16'] = 'grade_8'
    ```
34. Results cached in `site_voice_cache` with the same TTL pattern.

### Phase 9 — Content & Product Extraction

35. `extract_site_products(url)` — finds services / products mentioned on the site. For a contractor, might find "fence installation", "deck repair", "power washing". For a SaaS, might find "analytics dashboard", "API access", "team plans". Used by the proposal composer and the landing composer for credible defaults.
36. Extraction is pattern-match + LLM synthesis: scrape headings and lists from the site, pass to a fast-tier LLM to canonicalize into a list with descriptions and (if found) prices.
37. Store in `site_products_cache` with TTL.

### Phase 10 — Voice Inference From Prior Pages

38. `load_user_voice_preferences(user_id)` — pulls the last 3 published pages' content (from `page_revisions.html` with status='live'). A fast-tier LLM summarizes the user's established voice in a 2-sentence profile.
39. Cached on `users.voice_profile` JSONB column (added in this mission). Invalidated on each new page publish.
40. If no prior pages: skip, downstream uses either site voice (if available) or safe defaults.

### Phase 11 — Calendar & Availability Context

41. `load_calendars_summary(org_id)` — returns a lightweight summary of the org's availability calendars: which ones are configured, business hours, next 2 weeks of availability at a glance (sampled hourly). Used by the contact-form composer to generate a page with booking baked in when a calendar exists.
42. If no calendar: the contact-form composer still renders a form, just without the booking block.

### Phase 12 — Context Bundle Serialization

43. `ContextBundle` is a Pydantic model with optional fields for every context source:
    ```python
    class ContextBundle(BaseModel):
        brand_kit: BrandKit | None
        prompt_urls: list[str]
        site_brand: SiteBrand | None
        site_voice: VoiceProfile | None
        site_products: list[Product]
        user_voice: VoiceProfile | None
        recent_pages: list[PageSummary]
        org_templates: list[TemplateSummary]
        calendars: list[CalendarSummary]
        gather_duration_ms: int
        gather_incomplete: list[str] = []  # names of tasks that timed out
    ```
44. A `bundle.to_prompt_context()` method produces a token-efficient text block to inject into downstream system prompts. Example:
    ```
    ## Business context
    Name: Reds Construction
    Website: redsconstruction.com
    Colors: #5B8FB9 (primary), #F4E4BA (accent)
    Fonts: Inter / Playfair Display
    Tone: warm, local, no-nonsense. Uses phrases like "serving Rohnert Park since 2003", "honest work".
    Services offered: fence installation, deck repair, small jobs, consultations.
    Calendar: business hours 8am-5pm Mon-Fri, next opening Tuesday at 2pm.
    ```

### Phase 13 — Real-Time Context Feedback In Studio

45. When the user types a prompt that includes a URL, the Studio UI shows a subtle inline chip as soon as the URL is detected (frontend regex): "Looking up {domain}…" with a tiny spinner.
46. As the context gather runs (started on submit), successive updates stream back via SSE `context.*` events:
    - `context.brand.extracted` — user sees "Found your brand colors" chip.
    - `context.voice.inferred` — "Matching your tone".
    - `context.products.found` — "Noted your services".
47. These aren't blocking — the composer starts as soon as the gather has a minimum viable bundle (brand_kit always available, everything else optional). The context chips fade out once the preview starts rendering.
48. This makes the "thinking" felt. Atkinson's delight principle: the user sees Forge doing real work on their behalf, not just a generic spinner.

### Phase 14 — Caching & Observability

49. Redis cache keys:
    - `llm:call:{hash-of-inputs}` — short cache (60s) for identical calls within a session. Defends against user double-clicks and React double-renders.
    - `context:url:{url_hash}` — 24h cache for full site extraction.
    - `context:voice:{user_id}` — 24h cache; invalidated on publish.
50. Metrics emitted:
    - `llm.call.duration_ms{provider,model,role}` histogram.
    - `llm.call.tokens{provider,model,role,direction=input|output}` counter.
    - `llm.call.cost_cents{provider,model,role}` counter.
    - `llm.fallback.triggered{primary,fallback}` counter.
    - `context.gather.duration_ms` histogram.
    - `context.gather.task_status{task,status=completed|timeout|error}` counter.
51. Sentry breadcrumbs for every LLM call: provider, model, role, input token count, output token count, duration. Helps debug "it generated garbage" reports.

### Phase 15 — Tests

52. Unit tests for each provider: happy path non-streaming, happy path streaming, structured output validation, tool call parsing.
53. Provider chaos tests: inject failures (timeout, 429, 500, malformed JSON), verify fallback fires correctly.
54. Context gatherer tests:
    - All tasks complete → full bundle.
    - Some tasks timeout → bundle with `gather_incomplete` set.
    - All tasks timeout → bundle with only defaults; composer still has something to work with.
55. Integration test: given a prompt with a real URL (a test site we control, not live traffic), context returns brand colors and voice within the time budget.
56. Prompt evaluation harness runs on CI for every prompt file.
57. Load test: 50 concurrent Studio generate requests, verify p95 < 8s for the full generate-including-context flow.

### Phase 16 — Documentation

58. Write `docs/architecture/LLM_ORCHESTRATION.md` — the provider architecture, routing, fallback, caching, cost accounting.
59. Write `docs/architecture/CONTEXT_GATHERING.md` — the pipeline, the time budgets, the degradation modes.
60. Write `docs/runbooks/LLM_DEBUGGING.md` — how to debug "model output looks wrong", "costs too high this month", "one provider is down".
61. Mission report.

---

## Acceptance Criteria

- Provider adapter works for OpenAI, Anthropic, and Gemini with streaming and structured outputs.
- Fallback chain triggers correctly on primary failure.
- Cost and token usage tracked per org per model per role.
- Context gathering produces a complete bundle or times out gracefully — never blocks.
- URL-in-prompt triggers real brand extraction with under 3-second added latency.
- Voice extraction produces usable `VoiceProfile` objects for the downstream composers.
- Real-time context SSE events stream back to the frontend.
- Caching layers in Redis are operational and graceful on failure.
- All tests pass including chaos and load tests.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
