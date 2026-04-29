# V2 MISSION P-05 — Canvas-Aware Multi-Modal Orchestration

**Goal:** Take the orchestration brain from O-01 through O-04 and grow it into something that can fluently handle every workflow Forge now supports — single forms, proposals, decks, mobile screens, web pages, multi-page websites — through one unified pipeline that knows when to fan out, when to scope down to a region, when to apply changes site-wide, and when to ask the user a clarifying question (which we still try to avoid). Add the model-agnostic switching mechanism that lets admin pick OpenAI or Gemini at any time. Add multi-modal awareness so the orchestration layer can see uploaded screenshots, brand reference images, and uploaded PDFs and incorporate them into context. After this mission, Forge's AI is not a chatbot bolted onto a builder — it's a coherent design partner that thinks about your whole project.

**Branch:** `mission-v2-p05-canvas-aware-orchestration`
**Prerequisites:** O-01 through O-04 complete. V2-02 mobile canvas and V2-03 web canvas operational. V2-04 credit system live. The provider abstraction supports OpenAI, Gemini, Anthropic.
**Estimated scope:** Large. New graph types, multi-modal pipeline, region-edit specialization, site-wide refactor primitive, model-routing layer enhancements, vision-input handling.

---

## Experts Consulted On This Mission

- **Alan Kay** — *The orchestration is the medium. The user manipulates objects through it, not commands at it.*
- **Bret Victor** — *The system reflects the user's intent back. When intent is ambiguous, the system shows the alternatives.*
- **LangGraph 2026 production patterns** — *Graph-structured agents with conditional routing, fanout, retries — proven at scale.*
- **OpenAI / Anthropic / Google Gemini — multimodal best practices** — *Vision models accept image inputs; structured outputs hold across providers; streaming is uniform.*

---

## How To Run This Mission

The orchestration layer started simple: parse intent, plan, compose, review, persist. With six workflows now in play (form, proposal, deck, mobile, web page, website), each with its own quirks, the temptation is to fork the orchestration code per workflow. **Don't.** A forked orchestration becomes six divergent codebases that drift; a unified one with workflow-specific strategies stays maintainable.

The architecture stays graph-based (V2-02's directed-graph runtime). The mission's job is to:

1. Add **scope-level specialization** — the same graph nodes operate at different scopes (region within a screen, single screen, multi-screen flow, single page, multi-page website) with the right context bounds.
2. Add **multi-modal context** — vision inputs (screenshots, brand boards, PDFs) flow into the context-gathering pipeline alongside the existing URL/brand/voice extraction.
3. Add **site-wide and design-system-level transforms** — operations that aren't tied to a single screen but to the whole project.
4. Refine the **clarification flow** — when the user's intent has ambiguity worth surfacing, the inline clarify chip from O-02 supports new types of clarification (which screen of a flow to edit, which page of a site to expand, which breakpoint to tune).
5. Tighten **model routing** by role and budget so admin's provider toggle takes effect without further code changes.

Commit on milestones: scope hierarchy, multi-modal context, site-wide refactor, clarify flow extensions, model-router production rollout, evaluation harness, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Scope Hierarchy Formalization

1. Define `ScopeLevel` as a typed enum that the orchestration graph tracks throughout a run:
    ```python
    class ScopeLevel(str, Enum):
        REGION = "region"             # marquee selection within a screen/page
        ELEMENT = "element"           # single component clicked
        SECTION = "section"           # major page block (hero / form / etc)
        SCREEN = "screen"             # one mobile screen or one web page
        FLOW = "flow"                 # multi-screen mobile flow or multi-page website
        PROJECT = "project"           # the whole project — used rarely, e.g., site-wide rebrand
    ```
2. Every orchestration graph operation declares its scope. Rules:
    - **REGION** edits constrain output to elements within a bounding box; the validator from V2-02 detects unscoped drift.
    - **ELEMENT** edits constrain to a single component subtree.
    - **SECTION** edits operate within one named section (`data-forge-section="hero"`).
    - **SCREEN** edits operate on one full screen/page.
    - **FLOW** edits operate across multiple screens with the cross-screen consistency check from V2-02.
    - **PROJECT** edits cascade through every screen with rate-limited fan-out (max 20 parallel, queue rest).
3. Build a `ScopedComposer` base class that takes a `Scope` (the actual context — a bounding box, an element ID, a section name, a screen list) plus a `ScopeLevel` and exposes a uniform interface to the graph runtime:
    ```python
    class ScopedComposer(Protocol):
        async def compose(scope: Scope, prompt: str, context: ContextBundle) → ComposeResult: ...
    ```
4. The existing per-workflow composers from O-03 are refactored to implement this protocol. Behavior they shared (system prompt loading, brand-token application, render via Jinja, structured output retry) moves to the base class.

### Phase 2 — Multi-Modal Context

5. Extend the `ContextBundle` from O-01 to include **vision inputs**:
    ```python
    class VisionInput(BaseModel):
        kind: Literal['screenshot', 'brand_board', 'sketch', 'reference_design', 'pdf_page', 'photo']
        storage_key: str       # S3 key
        mime_type: str
        width: int
        height: int
        description: str | None = None      # user-provided caption
        extracted_features: dict | None = None  # cached extraction (colors, layout type, dominant elements)
    
    class ContextBundle(BaseModel):
        # ... existing fields
        vision_inputs: list[VisionInput] = []
    ```
6. Add the upload UX to the Studio chat panel: a paperclip icon next to the prompt input. Clicking opens a file picker for images and PDFs (max 5 per generation, max 10MB each). Uploaded files appear as small thumbnail chips above the prompt input with a remove (×) action.
7. The frontend uploads files via the existing presigned-URL pipeline (BI-03 Phase 11), saves the storage keys to a new `studio_attachments` table:
    ```sql
    CREATE TABLE studio_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      session_id TEXT NOT NULL,           -- groups attachments to a single Studio session
      storage_key TEXT NOT NULL,
      kind TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      width INT,
      height INT,
      description TEXT,
      extracted_features JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
    RLS enabled.
8. **Pre-extraction worker job** — when a file is uploaded, an `extract_vision_features` job runs:
    - For images: extract dominant colors (top 5), detected objects (via a vision model like GPT-4o-vision or Gemini Pro), inferred design style ("flat illustration", "photographic", "iOS-native screenshot"), text in image (OCR).
    - For PDFs: extract per-page text and rasterize each page to PNG for downstream vision use.
    - Results cached in `extracted_features` for instant retrieval on subsequent prompts.
9. The orchestration layer's prompt-construction step now includes vision inputs:
    - For providers that natively support vision (GPT-4o, Claude Opus, Gemini Pro): pass images directly in the API call's content array.
    - For providers without vision (or when an image-only-text-extraction is sufficient): inject the OCR'd text + extracted features as text context.
    - The `LLMRouter` (from O-01) routes vision-requiring calls to vision-capable models automatically.
10. The composer's system prompts are updated to acknowledge attached references: "If the user has attached a reference image, mirror its visual style — colors, layout density, mood — without copying it pixel-for-pixel. Cite specific elements you're emulating in the rationale."

### Phase 3 — Region-Scoped Edit Pipeline (Specialized)

11. The region-edit graph from V2-02 is generalized to handle both mobile and web canvases (single implementation). The pipeline:
    - **Inputs**: scope (`region` with bounding box), parent screen/page tree, list of element IDs overlapping the region, user prompt, full project context bundle.
    - **Pre-edit hash**: hash every element OUTSIDE the region. Stored as a fingerprint dict.
    - **Compose**: scoped LLM call with explicit instruction "Modify ONLY the listed element IDs. Preserve all others byte-identical."
    - **Validate**: hash every element again. Diff against pre-edit hashes. If any non-region element changed, route to the **drift-fix refiner**.
    - **Drift-fix refiner**: a fast-tier call that takes the modified tree + the list of elements that drifted + the original elements; outputs a tree where the drifted elements are reverted. Max 1 retry.
    - **Final validate**: same hash check. If still drifting, accept with `unscoped_drift=True` flag (the user sees a soft warning chip in the chat).
12. Region-edit cost (V2-04 credit table): 1 credit. Validates the abstraction — region edits are cheap because they're tightly scoped.
13. Performance: region edits target p95 < 4 seconds. The pre-hash + post-hash overhead is microseconds; the LLM call dominates.

### Phase 4 — Project-Wide Transforms

14. Some prompts implicitly target the whole project: "make all my pages more playful", "tighten everything up", "swap the brand color to cool blue". These need a different graph:
    - **Project-wide style/voice change**: the prompt is parsed by a `ProjectIntentParser` that decides which scope level applies. If it's a brand-token change, no LLM is needed — apply the new tokens and re-render. If it's a voice change, fan out per-screen/page edits with the new voice profile injected.
    - **Project-wide structural change**: e.g., "add a footer to every page" or "remove the second screen from each flow". Operates as a fan-out of section-level edits per screen.
15. Project-wide transforms warn the user before executing: "This will modify {N} screens. About {M} credits. Continue?" — explicit consent because the cost is non-trivial.
16. Failures in fan-out are isolated: if 7/8 screens succeed, the 1 failure is logged + retried in background; the user sees a partial-success banner with the option to retry just the failed screen. Same partial-failure UX as a tab-switch in a long-running multi-task agent.

### Phase 5 — Clarification Flow Extensions

17. The clarify SSE event from O-02 now supports new types of ambiguity:
    - **Workflow ambiguity** (existing): "Did you mean a contact form or a proposal?"
    - **Scope ambiguity** (new): "Which screen of your onboarding flow should I edit?" — with thumbnails of all screens as switchable chips.
    - **Breakpoint ambiguity** (new): "Should this change apply to mobile only, or all breakpoints?" — with three checkbox chips.
    - **Reference ambiguity** (new): "I see you uploaded 3 images — should I match the style of the first one specifically?" — with thumbnail switches.
18. Every clarification chip appears as an inline message in the chat panel. The user clicks to switch; the orchestration continues with the clarified intent.
19. Critical: the clarification ALWAYS appears AFTER a first-pass output has been delivered. Never blocks generation. The user sees a result; the chip says "I assumed X — switch to Y?". This preserves the "give them output before asking" principle from the original orchestration design.
20. The clarification UX has a 12-second self-dismiss — if the user takes no action, the assumption is locked in and subsequent edits operate against it. They can always undo or refine later.

### Phase 6 — Model Router Production Rollout

21. The `LLMRouter` from O-01 ships with the platform-level configuration that admin manages from V2-04 Phase 10. This mission productionizes:
    - Per-role configurable provider + model + fallback chain (loaded from the `model_routing_config` table updated via the admin UI).
    - Config changes propagate via Redis pub/sub to all running API instances within 1 second.
    - Per-org overrides (also from `model_routing_config` with org_id != NULL) take precedence.
    - Per-session overrides (the user's "switch provider" toggle in Studio for that session) take precedence over both.
22. Add a `model_routing_history` audit table — every config change is logged with who/when/what changed.
23. **Cost-aware routing** — for each role, track the trailing-7-day average cost-per-quality-score across providers (computed from `orchestration_runs`). Surface this in the admin UI ("OpenAI GPT-4o-mini: $0.003/run @ 87 quality. Anthropic Haiku 4.5: $0.005/run @ 90 quality."). Admin can manually override; auto-routing is opt-in.
24. **Cold-start protection** — a new model entering the pool starts at the lowest priority and ramps up only after 50 successful runs at acceptable quality. Prevents accidentally routing critical traffic to a misconfigured model.
25. **Failover semantics** — already documented in O-01. Confirm with end-to-end test that primary failure routes to the configured fallback chain in the order specified by admin.

### Phase 7 — Brand Drift & Voice Drift Detection (Generalized)

26. Brand drift from O-04 is generalized to all workflows. The detection rules:
    - Any hex color in the output that's not in the brand kit's allowed palette → drift.
    - Any font family that's not the brand's display or body font → drift.
    - Any image that doesn't match the brand's image style guidelines (warmth, density) → drift, flagged as warning rather than error.
27. Brand drift fixes are deterministic where possible (re-render with brand tokens) and LLM-driven where not (image regeneration with brand-style anchors).
28. Voice drift is similarly generalized — checked against the org's voice profile + the current page/screen/site's voice anchor. The fast-tier LLM scores voice match; below 70 fires a refine pass.

### Phase 8 — Vision-Driven Generation (Reverse-Engineering)

29. A specific vision-driven flow: the user uploads a screenshot of a competitor's site or app and says "build something like this for my business." The orchestration layer:
    - Routes to a vision-capable model.
    - Extracts the layout structure from the screenshot — list of sections, approximate component types, color scheme, typography choices.
    - Adapts to the user's brand kit and voice.
    - Generates a Forge-built mini-app that captures the SPIRIT of the reference without copying it.
30. Mandatory disclaimers: the system prompt explicitly forbids reproducing the competitor's text, logo, or proprietary design assets. The result is "inspired by" not "copied from." Trademark and copyright stay safe.
31. The user sees a small "Generated based on your reference image" chip on the artifact card. Click to see what the system extracted from the reference; useful for debugging and trust.

### Phase 9 — Multi-Step Plan Mode

32. For complex prompts that span multiple operations, add a **Plan mode** (loosely modeled on Claude Code's plan mode):
    - User prompts something complex: "Build me a coffee shop website with a homepage, menu, about page, and contact form, then make a matching pitch deck."
    - The orchestration layer recognizes this is multi-stage (multi-page site + deck = 2 distinct outputs).
    - Returns a **plan** in the chat panel: ordered steps with estimated credits per step. "1. Generate 4-page website (30 credits). 2. Generate 10-slide pitch deck (25 credits). Total: ~55 credits."
    - User can edit the plan (add/remove steps, swap order) before approving.
    - On approval, the plan executes step-by-step. User sees each step's progress in the chat.
33. Plan mode is opt-in for complex prompts — single-step prompts skip it. Activated by:
    - The intent parser detecting multiple discrete output goals.
    - The user explicitly typing "plan first" or clicking a "Plan first" toggle.
34. Plan execution has cancellation: any step can be cancelled mid-run; subsequent steps don't execute. Already-completed steps persist.

### Phase 10 — Streaming UX Polish

35. SSE streaming improvements based on the multi-workflow expansion:
    - **Per-screen progress** (mobile/web canvas): each screen in a multi-screen generation streams its own `screen.complete` event. Canvas renders the screens as they arrive.
    - **Per-section progress** (single page): each section streams a `section.complete` event. The preview iframe renders sections as they arrive (subtle fade-in per section).
    - **Cost ticker**: every credit charge fires a `credit.charged` event with the current session balance. The chat-panel usage bar updates live.
    - **Reasoning preview** (optional): for high-effort runs (Max plans only), show abbreviated reasoning steps in the chat — "Considering layout options... Selected three-column layout for desktop, single-column for mobile..." — to make the thinking visible. Collapsed by default.

### Phase 11 — Evaluation Harness Expansion

36. Extend the evaluation harness from O-03 to cover the new workflows:
    - 30+ fixtures per new composer (mobile_app, website, web_page).
    - Region-scoped edit fixtures: known starting tree + known region + known prompt → expected output (with strict drift detection).
    - Multi-modal fixtures: image + prompt → composer output. Validates vision integration.
37. Composer eval harness reports per-mission pass/fail; failures block CI per the standard pattern.
38. **Quality regression suite** — once a quarter, sample 100 random `orchestration_runs` from production, ask a separate review LLM to score them on a rubric, compare against the moving 30-day baseline. Below-baseline scoring fires an alert in the platform admin dashboard.

### Phase 12 — Tests

39. Region-edit drift tests across mobile and web (synthesized drift cases).
40. Project-wide transform tests: brand color change updates all screens; voice change runs per-screen refines; failures isolated.
41. Multi-modal vision tests: upload a screenshot, prompt "match the style", verify color extraction and layout influence in output.
42. Plan-mode tests: complex prompt produces an editable plan; plan executes step-by-step; mid-run cancellation halts execution cleanly.
43. Model-routing tests: admin changes provider for a role, next call uses the new provider (verified via `orchestration_runs.provider`).
44. Clarification tests for each new ambiguity type (workflow, scope, breakpoint, reference).
45. Performance: project-wide transform on 8-page site completes within budget; per-screen edits parallelize as expected.

### Phase 13 — Documentation

46. `docs/architecture/CANVAS_ORCHESTRATION.md` covers scope hierarchy, multi-modal context, region edits, project-wide transforms, clarification flow extensions.
47. `docs/runbooks/ORCHESTRATION_DEBUGGING.md` updated with new failure modes (drift, multi-modal extraction failures, plan-mode cancellation).
48. `docs/architecture/MODEL_ROUTING.md` documents production routing, cost-aware decisions, failover, audit history.
49. Mission report.

---

## Acceptance Criteria

- Scope hierarchy unifies region / element / section / screen / flow / project edits under one graph runtime.
- Multi-modal context flows from upload through extraction to composer prompts, routed to vision-capable models when needed.
- Region-scoped edits enforce drift-free output via hash validation and drift-fix refiner.
- Project-wide transforms execute via fan-out with isolated partial-failure handling.
- Clarification flow handles workflow / scope / breakpoint / reference ambiguity inline, never blocking output.
- Admin model-routing toggle propagates within 1 second; per-org and per-session overrides honored.
- Cost-aware routing surfaces trailing-7-day metrics; cold-start protection prevents bad-routing surprises.
- Brand-and-voice drift detection generalized across all workflows.
- Vision-driven generation respects trademark/copyright via system-prompt safeguards.
- Plan mode handles complex multi-step prompts with editable plans and cancellation.
- Streaming UX provides per-screen, per-section, cost-ticker, and reasoning-preview events.
- Evaluation harness covers all new composers; quality regression suite runs quarterly.
- All tests pass.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
