# ORCHESTRATION MISSION O-02 — Intent Parsing, Planning & The Agent Pipeline

**Goal:** Turn a vague user prompt ("I need a contact page for my business forgecoffee.com in my brand styles") into a complete, typed, actionable plan that downstream agents can execute without asking a single follow-up question. This mission builds the planning layer of Forge's AI: a fast intent parser that classifies workflow and extracts structured fields; a planner that assembles a section-by-section blueprint for the page; and the multi-agent pipeline (graph-structured, inspired by LangGraph's production-ready 2026 patterns) that coordinates specialized expert agents through generate → review → refine cycles. After this mission, the "director" of Forge's AI exists — and it always makes a decision rather than asking a question.

**Branch:** `mission-o02-intent-planning-pipeline`
**Prerequisites:** O-01 complete. Provider abstraction, context gathering, structured output discipline are all operational.
**Estimated scope:** Large. Multiple coordinated agents, a planning layer, graph-structured orchestration. The brain of Forge.

---

## Experts Consulted On This Mission

- **Alan Kay** — *Is this a tool or a new medium? The pipeline should feel like Forge is thinking, not following a recipe.*
- **Don Norman** — *The planner is the place where the user's mental model meets the system's mental model. They must align.*
- **Jesse James Garrett** — *Each agent has a role; the pipeline is the experience. Design the experience first, agents second.*
- **Ken Thompson / Dennis Ritchie** — *Each agent should do one thing excellently. Composition creates power.*

---

## How To Run This Mission

The guiding constraint from the user brief: **always show a designed output before asking for more information.** If the intent is ambiguous, we pick a default and ship — the user can always refine. If specific fields are missing (client name, pricing, tone), we use sensible defaults drawn from context — and mark those as "assumed" in the chat feed so the user can correct them.

Architecturally, we use a **directed graph with conditional routing and retry loops** — the pattern LangGraph has proven as the 2026 production default. Unlike free-form agent chat (AutoGen), each node in the graph has a defined input and output. Unlike a linear pipeline (CrewAI sequential mode), branches and retries are first-class.

We don't need to pull in LangGraph as a dependency though — the graph is small and bespoke, and rolling it in ~300 lines of Python keeps the control tight and the debugging transparent. The research is our reference; our implementation is ours.

Commit on milestones: intent parser, planner, graph engine, review agent, refine loop, SSE event stream, tests passing.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Intent Parser

1. Define the `PageIntent` Pydantic model (the parser's output):
    ```python
    class PageIntent(BaseModel):
        workflow: Literal['contact_form','proposal','pitch_deck','landing','menu','event_rsvp','gallery','promotion','other']
        page_type: PageType
        confidence: float = Field(ge=0, le=1)
        
        # Core human-friendly fields
        title: str                            # "Contact Reds Construction"
        headline: str                         # "Get a free quote in under 24 hours"
        subheadline: str | None = None
        
        # Workflow-specific structured extraction
        form_fields: list[FormField] = []     # for contact/booking/rsvp
        booking: BookingIntent | None = None  # for forms with booking
        proposal: ProposalIntent | None = None
        deck: DeckIntent | None = None
        menu: MenuIntent | None = None
        
        # Design direction
        visual_direction: VisualDirection  # warm/minimal/bold/playful/formal
        density: Literal['sparse','balanced','dense'] = 'balanced'
        
        # Alternative interpretations (for clarify UX)
        alternatives: list[AlternativeInterpretation] = []
        
        # What we assumed
        assumptions: list[Assumption] = []   # each: {field, value, reason}
    ```
    Every field has a description so the LLM knows how to populate it correctly.
2. Create `app/services/orchestration/intent.py` with `parse_intent(prompt: str, context: ContextBundle) -> PageIntent`:
    - Uses the `intent_parser` role (routed to fast tier — GPT-4o-mini or Claude Haiku 4.5).
    - System prompt includes the full workflow taxonomy with examples of each, the context bundle's `to_prompt_context()`, and the explicit instruction: "If unclear, pick the most likely workflow, set confidence accordingly, and list alternatives. Never ask a question — always commit to an interpretation."
    - User prompt is the raw prompt + a constructed header: `Available context: {bundle summary}`.
    - Output validated against `PageIntent` schema. Retry on schema failure once.
3. Assumption tracking: whenever the parser fills in a field the user didn't explicitly state, it adds an `Assumption(field='pricing', value='$65/hr labor', reason='inferred from "small jobs" + market rates')` to the list. These surface in Studio's chat panel as "I assumed…" ghost messages the user can click to correct.
4. Confidence thresholds:
    - `>= 0.85` — proceed silently with the chosen workflow.
    - `0.65–0.85` — proceed but emit a `clarify` SSE event showing the top 2 candidates as switchable chips. Non-blocking.
    - `< 0.65` — proceed with the top candidate but emit the clarify chip prominently; if the user doesn't interact within 8 seconds, continue.
5. The parser is deliberately lightweight. It doesn't pick colors, doesn't write prose, doesn't choose layouts. Its only job is "what does the user want, in structured form?" This separation of concerns makes it cheap to run (~$0.002 per call), fast (< 2s), and easy to evaluate.

### Phase 2 — Planner

6. The Planner turns `PageIntent` + context into a `PagePlan` — the blueprint the composer will execute against.
    ```python
    class PagePlan(BaseModel):
        workflow: WorkflowType
        sections: list[SectionSpec]     # ordered list of sections to generate
        brand_tokens: BrandTokens        # resolved colors, fonts, radii, spacing
        voice_profile: VoiceProfile       # tone guide for the composer
        component_hints: dict[str, str]  # per-section, hints for the composer ("use the hero_split layout")
        data_hints: dict[str, Any]       # structured data the composer should include (form_fields, line_items, slide content)
        
    class SectionSpec(BaseModel):
        id: str                         # "hero", "booking_block", "trust_signals"
        role: str                       # semantic role
        priority: int                   # render order
        layout_family: str              # "full_bleed_hero" | "two_column" | "card_grid"
        content_brief: str              # 1-2 sentence description for the composer
        min_words: int = 0
        max_words: int = 200
        required_data: list[str] = []   # ["form_fields", "calendar_slots"]
    ```
7. Each workflow has a **planner strategy** that knows the ideal section composition for that workflow. Strategies live in `app/services/orchestration/planners/`:
    - `contact_form_planner.py` — hero → intro → form (+ booking if calendar context) → trust signals → footer.
    - `proposal_planner.py` — cover → executive summary → scope of work → line items → timeline → terms → acceptance.
    - `pitch_deck_planner.py` — delegates to the deck framework chosen from O-01's research (Sequoia, YC, etc.).
    - `landing_planner.py` — hero → problem/value → features → social proof → pricing → CTA.
    - `menu_planner.py`, `rsvp_planner.py`, etc.
8. Each planner is a pure function: `plan(intent, context) -> PagePlan`. No LLM call needed for the structural plan itself — these are deterministic rule-based compositions. The LLM call was the intent parser; the planner consumes its output. This keeps planning fast (<50ms) and predictable.
9. Section content briefs DO take context into account. For a proposal, the planner populates the scope-of-work section's `content_brief` with "A 3-day fence installation for the Johnson property at 1234 Maple. 12 linear feet of cedar privacy fence. $2,400 materials, 3 days labor at $65/hour." — extracted from the intent. The composer's job becomes turning that concrete brief into prose, not inventing facts.

### Phase 3 — The Graph Engine

10. Create `app/services/orchestration/graph.py` — a small, explicit directed-graph runtime:
    ```python
    @dataclass
    class GraphNode:
        name: str
        run: Callable[[GraphState], Awaitable[GraphState]]
        
    @dataclass
    class GraphEdge:
        from_node: str
        to_node: str
        condition: Callable[[GraphState], bool] | None = None  # None = unconditional
        
    class Graph:
        def __init__(self, nodes: list[GraphNode], edges: list[GraphEdge], entry: str, terminal: str): ...
        async def run(self, initial_state: GraphState) -> GraphState: ...
    ```
11. `GraphState` is a Pydantic model holding everything passed between nodes: the intent, the plan, the partial composed HTML, the review findings, the current iteration count, the event emitter.
12. Support cycles with a max iteration guard. For the review → refine loop, cap at 3 iterations. If quality doesn't converge by then, commit the best-so-far and flag `degraded_quality=True` in the state (surfaces as a subtle chip in Studio — "Drafted with some uncertainty; review before publishing").
13. Each node gets an `EventEmitter` that it can use to stream progress to the SSE connection. The graph runtime threads this through automatically.
14. Error handling: any node that raises produces a `GraphState.errors[]` entry and transitions to the terminal node early. The user gets a friendly error message with the partial output if any was generated.

### Phase 4 — The Generate Graph

15. The standard generate graph has these nodes (for contact form + proposal + landing workflows; deck has its own graph because of the per-slide fan-out):
    ```
    entry → intent_parser → planner → composer → reviewer → (refiner | validator) → persister → terminal
                                        ↑________________|
                                       (conditional: if review finds fixable issues, loop once)
    ```
16. Nodes:
    - `intent_parser` — runs the parser from Phase 1.
    - `planner` — runs the deterministic planner from Phase 2.
    - `composer` — the heavy-tier LLM call that writes the page (implemented in detail in O-03).
    - `reviewer` — the mixture-of-experts review agent (O-04).
    - `refiner` — a fast-tier LLM call that addresses reviewer findings. Updates specific sections.
    - `validator` — a deterministic check: HTML well-formed, required fields present, no broken references.
    - `persister` — writes the page and initial revision to the DB.
17. Conditional routing: after the reviewer runs, the graph checks `state.review.fixable_count`:
    - If > 0 AND `state.iterations < 3`: route to `refiner` → back to `reviewer`.
    - Else: route to `validator`.
18. The validator is NOT a nice-to-have. It's the last gate before persistence. It runs:
    - HTML parsing via `lxml` or `html5lib` — must parse without errors.
    - Required elements present — if workflow requires a form, `<form>` element exists; if it requires a submit button, one exists.
    - No unresolved template tokens (`{{ x }}` patterns in output).
    - All `data-forge-section` attributes present for section-click editing.
    - Images have alt text.
    If validation fails, route BACK to the refiner with validation errors as additional review findings. Max 1 iteration of validation-driven refinement.

### Phase 5 — The Section-Edit Graph (Targeted Changes)

19. A separate, smaller graph handles section edits:
    ```
    entry → section_intent_parser → section_composer → section_validator → persister → terminal
    ```
20. `section_intent_parser` — a lightweight classifier that figures out what the user wants to change. Output: `{target_section, edit_type: 'rewrite'|'shorten'|'expand'|'add_element'|'remove_element', hints: [...]}`.
21. `section_composer` — a fast-tier call that regenerates JUST the target section. Input: the current page HTML, the target section's original HTML, the edit intent, brand context. Output: the new section HTML.
22. `section_validator` — runs only on the diff (new section) to verify nothing broke structurally.
23. `persister` — creates a new `page_revisions` entry with `edit_type='section_edit'`, updates `current_revision_id`.
24. This graph runs end-to-end in under 3 seconds for typical cases.

### Phase 6 — The Refine Graph (Whole-Page Revisions)

25. Similar to section edits but for whole-page refines. The composer operates with more latitude, taking the current page as input and producing a revision based on the refine prompt.
26. Strategy: don't regenerate from scratch. The composer receives the current HTML + the refine prompt + a directive: "Modify only what the user asks. Keep everything else byte-identical." This preserves user customizations and keeps costs down.
27. Output passes through the same reviewer + validator as the generate graph.

### Phase 7 — SSE Event Schema

28. Standardize the SSE event types emitted by the orchestration layer. Frontend (F-04 Studio) consumes these:
    ```
    event: context
    data: {"stage":"gather","status":"started"}
    
    event: context
    data: {"stage":"gather","status":"completed","bundle":{...summary...},"duration_ms":1847}
    
    event: intent
    data: {"workflow":"contact_form","confidence":0.91,"alternatives":[]}
    
    event: clarify
    data: {"candidates":[{"workflow":"proposal","confidence":0.61}, {"workflow":"contact_form","confidence":0.32}]}
    
    event: plan
    data: {"sections":["hero","intro","form","trust","footer"],"voice":"warm_local"}
    
    event: compose.start
    data: {}
    
    event: compose.section
    data: {"section":"hero","html":"<section data-forge-section=\"hero\">...</section>"}
    
    event: compose.complete
    data: {"html_length":4872,"duration_ms":6420}
    
    event: review.start
    data: {}
    
    event: review.finding
    data: {"severity":"suggestion","section":"form","message":"Consider adding a phone field"}
    
    event: review.complete
    data: {"fixable_count":0,"suggestions_count":2}
    
    event: refine.start
    data: {}
    
    event: validate.complete
    data: {"valid":true}
    
    event: persist
    data: {"page_id":"...","revision_id":"...","slug":"..."}
    
    event: done
    data: {"page_id":"...","url":"/pages/..."}
    
    event: error
    data: {"code":"provider_unavailable","retry":false}
    ```
29. Each event has a type + a JSON data payload. All streamable. The frontend's consumer is forgiving — unknown event types are ignored; known events trigger UI updates.

### Phase 8 — Iteration & Cost Budgeting

30. Every graph run has a budget object:
    ```python
    @dataclass
    class RunBudget:
        max_tokens: int = 30000
        max_llm_calls: int = 8
        max_wall_time_seconds: float = 45.0
        max_cost_cents: int = 50
    ```
31. Budgets are tracked in the `GraphState` and incremented by each node. Before each LLM call, the node checks if the budget is exceeded. If it is, the node either:
    - Skips (optional steps like extra review iterations).
    - Degrades (uses a cheaper model).
    - Aborts (with a partial result returned to the user).
32. The user's active plan determines the default budget:
    - Starter: 20k tokens, 5 calls, 30s wall, 30¢.
    - Pro: 40k, 10 calls, 60s, 80¢.
    - Enterprise: 100k, 20 calls, 120s, $2.
33. For complex workflows (pitch deck with 14 slides, long proposal with 10 scope phases), the budget is increased proportionally.

### Phase 9 — Workflow Clarify Flow

34. When the intent parser returns confidence < 0.85, the graph emits the `clarify` event BEFORE invoking the planner. The frontend shows the switch chips.
35. If the user clicks a different candidate within 8 seconds, the frontend sends a follow-up `POST /api/v1/studio/generate/continue` with the chosen workflow. The graph re-routes from the planner with the corrected intent.
36. If no interaction: the graph proceeds with the top candidate automatically after 8 seconds. The user can always refine with "actually I meant a proposal" later — the system never blocks.

### Phase 10 — Context Integration

37. The context bundle from O-01 is passed into every node via the graph state. Each node that uses LLM injects relevant parts of the bundle into its prompt via `bundle.to_prompt_context()`.
38. Context staleness: if the user has been in Studio for > 5 minutes since the last context gather (e.g., they did some edits and are now refining), refresh the bundle before the refine graph starts.
39. Context for section edits: sections don't need the full bundle — just the brand kit and voice profile. Keep section-edit token costs minimal.

### Phase 11 — Graph Execution Observability

40. Every graph run gets a `run_id` (UUID). All logs, metrics, SSE events, and LLM calls tag with this ID.
41. Persist a trace of each graph run to a dedicated table for post-mortem review:
    ```sql
    CREATE TABLE orchestration_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      page_id UUID REFERENCES pages(id),
      user_id UUID REFERENCES users(id),
      graph_name TEXT NOT NULL,  -- 'generate' | 'section_edit' | 'refine'
      prompt TEXT,
      intent JSONB,
      plan JSONB,
      review_findings JSONB,
      node_timings JSONB,  -- {node_name: duration_ms}
      total_tokens_input INT NOT NULL DEFAULT 0,
      total_tokens_output INT NOT NULL DEFAULT 0,
      total_cost_cents INT NOT NULL DEFAULT 0,
      total_duration_ms INT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('completed','degraded','aborted','failed')),
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_orch_runs_org_created ON orchestration_runs(organization_id, created_at DESC);
    ```
    RLS enabled.
42. An internal admin view at `(app)/admin/orchestration-runs` lets the Forge team inspect recent runs, see which prompts led to degraded outputs, identify patterns for improvement.

### Phase 12 — Tests

43. Unit tests for each node (mocking LLM calls with fixtures).
44. Integration tests for each graph: given a prompt, verify the graph reaches the terminal state with valid output.
45. Property tests on the intent parser: given a corpus of 50 real user prompts, verify classification accuracy ≥ 92% (measured against hand-labeled expected workflows).
46. Budget tests: set a tiny budget, verify the graph degrades correctly and returns a partial result.
47. Chaos tests: inject node failures, verify graceful terminal transitions with useful error messages.
48. Snapshot tests for the review → refine loop: given a known-buggy composer output, verify the reviewer catches the issue and the refiner fixes it.
49. Latency budget test: end-to-end generate of a standard contact form should complete p95 < 10s.
50. Cost ceiling test: 100 random prompts must average < $0.08 per generation on the default plan.

### Phase 13 — Documentation

51. Write `docs/architecture/GRAPH_PIPELINE.md` — the graph model, node responsibilities, state schema, SSE events, budget enforcement.
52. Write `docs/runbooks/INTENT_DEBUGGING.md` — common intent parsing failures, how to inspect and improve.
53. Write `docs/architecture/CLARIFY_FLOW.md` — the non-blocking clarification UX and why it's "always ship output".
54. Mission report.

---

## Acceptance Criteria

- Intent parser classifies 92%+ of test prompts correctly with calibrated confidence.
- Low-confidence intents emit clarify events without blocking the pipeline.
- Planner produces complete, well-structured plans for every workflow deterministically.
- Graph engine runs generate, section-edit, and refine pipelines with correct routing and cycles.
- SSE event schema is stable and frontend-consumable.
- Budget enforcement degrades gracefully without hard failures.
- Orchestration runs table captures every run for observability.
- All tests pass; end-to-end generate completes within latency and cost budgets.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
