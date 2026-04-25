# ORCHESTRATION MISSION O-04 — Mixture-of-Experts Review & Self-Healing Loop

**Goal:** Build the quality layer — the panel of expert designers who read every Forge-composed page before it reaches the user, flag problems, and either fix them automatically or surface them as actionable refinements. Each expert has a specific lens (Raskin for clarity, Rams for subtraction, Norman for affordance, Atkinson for delight, Nielsen for usability, Tufte for data-ink ratio, Kare for visual recognition). Their findings converge into a single prioritized review that drives the graph's refine loop from O-02. After this mission, no Forge page ships without a critique from seven designers and a refinement pass that addresses every actionable finding.

**Branch:** `mission-o04-review-selfhealing`
**Prerequisites:** O-01, O-02, O-03 complete. Composers produce structured output; the graph engine supports the review → refine cycle; the provider abstraction routes reliably.
**Estimated scope:** Large. The review is multi-agent in spirit but the implementation is clever — we don't run seven LLM calls per page. We use one heavy-tier call with a structured multi-lens prompt that returns findings attributed to the right expert. This matches LangGraph-style patterns over CrewAI-style patterns for cost and latency.

---

## Experts Consulted On This Mission

- **The panel itself** — each expert's question lives in their lens of the review prompt.
- **Alan Kay** — *Can we give Forge taste? Taste emerges from structured self-critique.*
- **Linus Torvalds** — *The review system has to fail gracefully. A broken reviewer can't break the pipeline.*
- **Jakob Nielsen** — *The review must be measurable. If we can't evaluate it, we can't improve it.*

---

## How To Run This Mission

Two architectural choices, both counter-intuitive but correct:

1. **One LLM call, multiple lenses.** Running seven separate LLM calls (one per expert) would be 7x the cost and 7x the latency with no quality gain. Instead: one carefully structured prompt instructs the heavy-tier model to evaluate under each expert's lens sequentially, returning findings attributed to the right expert. This is how production systems (LangGraph, OpenAI o1) handle multi-lens evaluation in 2026. 

2. **Findings are structured, not free text.** Every finding has `{expert, severity, section, dimension, message, suggested_action, auto_fixable}`. This lets the refiner target fixes precisely and lets us measure review quality over time.

The user's brief asked for "a mixture of experts" — we give them that in semantic substance while keeping the implementation tight and affordable.

Read O-02's `GraphState` and `SSE event schema` carefully — the review node emits `review.finding` events as it streams, which the frontend surfaces in the chat panel as ghost messages ("Rams noticed the pricing section has 3 competing CTAs — want me to reduce to 1?").

Commit on milestones: review agent and prompt, finding schema, severity triage, auto-refine integration, surfaced findings UX, quality metrics, evaluation harness, tests.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Expert Lens Catalog

1. Define the expert panel and each expert's lens in code:
    ```python
    @dataclass
    class ExpertLens:
        name: str                          # "Dieter Rams"
        specialty: str                     # "subtraction, restraint"
        key_questions: list[str]           # the questions the expert asks
        evaluation_dimensions: list[str]   # "is_element_earning_space", "word_economy", ...
    
    EXPERT_PANEL = [
        ExpertLens(
            name="Jef Raskin",
            specialty="interaction clarity, no modes",
            key_questions=[
                "Does the user always know what to do next?",
                "Are there any unnecessary modes or hidden states?",
                "Does the interface interrupt flow?",
            ],
            evaluation_dimensions=["primary_action_clarity", "mode_free", "predictability"],
        ),
        ExpertLens(
            name="Dieter Rams",
            specialty="subtraction, honesty, restraint",
            key_questions=[
                "Does every element serve a purpose?",
                "What can we remove without harming the experience?",
                "Is this honest about what it does?",
            ],
            evaluation_dimensions=["element_earning", "word_economy", "honest_messaging"],
        ),
        ExpertLens(
            name="Don Norman",
            specialty="affordance, feedback, mental models",
            key_questions=[
                "What mental model will users form?",
                "Are possible actions obvious from appearance alone?",
                "Is feedback immediate and clear?",
            ],
            evaluation_dimensions=["affordance_clarity", "feedback_presence", "mental_model_fit"],
        ),
        ExpertLens(
            name="Bill Atkinson",
            specialty="delight, fluidity, reward",
            key_questions=[
                "Where are the moments of joy?",
                "Does it feel responsive and alive?",
                "Does it reward curiosity?",
            ],
            evaluation_dimensions=["delight_present", "responsiveness_signal", "warmth"],
        ),
        ExpertLens(
            name="Jakob Nielsen",
            specialty="measurable usability",
            key_questions=[
                "Can users accomplish the task quickly?",
                "Are errors prevented rather than corrected?",
                "Is terminology consistent?",
            ],
            evaluation_dimensions=["task_efficiency", "error_prevention", "consistency"],
        ),
        ExpertLens(
            name="Edward Tufte",
            specialty="data-ink ratio, clarity",
            key_questions=[
                "Is every pixel doing information work?",
                "Is decorative chrome hiding data?",
                "Are charts honest and scaled correctly?",
            ],
            evaluation_dimensions=["data_ink_ratio", "chart_honesty", "decoration_budget"],
        ),
        ExpertLens(
            name="Susan Kare",
            specialty="visual recognition, warmth",
            key_questions=[
                "Can users understand this instantly without reading?",
                "Does it feel human rather than corporate?",
                "Would this still work at small sizes?",
            ],
            evaluation_dimensions=["visual_recognition", "warmth", "glanceable"],
        ),
    ]
    ```
2. The panel is registered with the orchestration layer; extensible via config if we want to swap or add experts later (e.g., "for dense data dashboards, weight Tufte more heavily").
3. **Weighting**: each workflow has an expert weighting profile. A proposal is weighted toward Norman and Nielsen (clarity of the legal commitment). A pitch deck is weighted toward Jobs, Tufte, Kare (visual narrative). A contact form is weighted toward Raskin, Systrom, Atkinson (friction removal + delight). Weights influence how findings are prioritized — a Norman finding on a proposal gets higher severity than on a deck.

### Phase 2 — Finding Schema

4. The structured finding the reviewer emits:
    ```python
    class Finding(BaseModel):
        expert: str                                          # "Dieter Rams"
        severity: Literal['critical', 'major', 'minor', 'suggestion']
        section_ref: str | None                              # which component, e.g., "form" or "hero"
        dimension: str                                       # "element_earning"
        message: str                                         # one-sentence explanation
        specific_quote: str | None                           # exact text from the page this refers to
        suggested_action: str                                # "Remove the 'Why choose us?' section — it repeats the intro"
        auto_fixable: bool                                   # can the refiner fix this without the user's input?
        confidence: float = Field(ge=0, le=1)                # reviewer's confidence
    ```
5. Severity taxonomy:
    - **Critical**: the page fails its purpose. A contact form with no submit button. A proposal missing the acceptance block. These are rare — the validator in O-02 catches most of them first.
    - **Major**: the page works but has a significant flaw. No trust signals on a cold-landing contact page. Pricing with three competing CTAs.
    - **Minor**: small improvement. Redundant word in headline. Slightly long intro.
    - **Suggestion**: design alternative. "A two-column layout might better suit this dense content."
6. `auto_fixable`:
    - Critical + `auto_fixable=True`: the refiner fixes immediately. Example: missing submit button → inject.
    - Major + `auto_fixable=True`: refiner attempts the fix once in the review-refine loop.
    - Any severity + `auto_fixable=False`: surfaces to the user as a suggestion chip. User decides.
7. **Fixability rule**: a finding is auto-fixable only if the fix is deterministic or very-low-risk. Tone changes are usually NOT auto-fixable (they affect voice, which the user owns). Structural additions (missing section) ARE auto-fixable when the composer's safe defaults apply.

### Phase 3 — Review Prompt Architecture

8. Create `apps/api/app/services/llm/prompts/reviewer.v1.md`. The prompt has this structure:
    ```markdown
    # Role
    You are a design review panel. Seven legendary designers sit at this table. When asked to evaluate a page, you walk through each expert's lens in sequence and produce findings attributed to the right expert. You never invent findings — you either see an issue through an expert's lens or you pass.
    
    # The page
    [ComponentTree JSON of the page being reviewed]
    
    # Context
    - Workflow: {{ workflow }}
    - Voice profile: {{ voice_summary }}
    - Brand tokens: {{ brand_summary }}
    - User's original prompt: {{ user_prompt }}
    - Plan: {{ plan_summary }}
    
    # Expert weights for this workflow
    {{ weights_table }}
    
    # Your job
    For each of these seven experts, evaluate the page through their lens. Produce 0-3 findings per expert (quality over quantity — if an expert has no concerns, return empty).
    
    ## Expert 1: Jef Raskin
    Raskin asks:
    - Does the user always know what to do next?
    - Are there any unnecessary modes or hidden states?
    - Does the interface interrupt flow?
    
    Raskin dimensions: primary_action_clarity, mode_free, predictability.
    
    [Walk through the page. Emit findings using the Finding schema. For each finding, include the expert's specific question that prompted it.]
    
    ## Expert 2: Dieter Rams
    [... same pattern ...]
    
    [... all seven experts ...]
    
    # Output format
    Return a JSON object `{"findings": [Finding...], "overall_quality_score": 0-100, "summary": "..."}`.
    
    # Critical instructions
    - Be parsimonious. A good page may get 2 findings. A typical page gets 5-8. Over 12 findings means you're nitpicking — dial back.
    - Never invent exemplary work that doesn't exist. Reference only what's actually in the page.
    - The `auto_fixable` determination: a fix is auto_fixable if a refiner can implement it without changing the user's core choices. "Shorten this paragraph" is auto_fixable. "Consider a different tone" is not.
    - Findings are actionable. "The hero could be stronger" is useless; "The hero's headline is 14 words — shorten to 6-8" is actionable.
    - Findings target specific sections via section_ref.
    ```
9. The prompt runs in structured output mode — the output schema is `ReviewReport { findings: [Finding], overall_quality_score: int, summary: str }`.
10. **Token efficiency**: the prompt is ~4000 tokens. For a typical page of 3000 tokens, total context is ~7000 tokens. At heavy-tier pricing, reviews cost ~$0.02-0.04 per page. Far cheaper than 7 separate expert calls.
11. Budget: reviews are capped at a 20-second wall time; if the LLM takes longer, the graph skips to validation with an empty review (fail-open). Logged and alerted.

### Phase 4 — Streaming Findings

12. The reviewer streams. As each expert's findings emerge (the structured output yields them sequentially), the graph emits `review.finding` SSE events:
    ```
    event: review.finding
    data: {"expert":"Dieter Rams","severity":"minor","section_ref":"trust_signals","message":"Three trust signals is good — four starts to feel insecure","auto_fixable":true,"suggested_action":"Remove the 'family owned' badge; it's repeated in the intro."}
    ```
13. The frontend's Studio chat panel surfaces these as small ghost messages in real-time — the user sees the review happening, not just a final report. Creates the sense of a real panel.
14. After the last finding, the graph emits `review.complete` with counts: `{"fixable_count": 2, "suggestions_count": 3, "quality_score": 87}`.

### Phase 5 — Auto-Refine Loop

15. If `fixable_count > 0`, the graph routes to `refiner` (from O-02). The refiner receives the full set of auto-fixable findings as its task:
    ```json
    {
      "page_html": "...",
      "findings": [
        {"section": "hero", "action": "Shorten headline from 14 words to 6-8", "expert": "Dieter Rams"},
        {"section": "trust_signals", "action": "Remove 'family owned' badge; repeated in intro", "expert": "Dieter Rams"},
      ],
      "budget": "small — preserve everything else byte-identical"
    }
    ```
16. The refiner's system prompt (reused from O-03's refine composer) emphasizes precision: change ONLY what's flagged. It outputs a modified `ComponentTree` that the rendering engine then re-renders into updated HTML.
17. After refine, the graph re-runs review (second pass). Expected behavior: findings that were fixable either are fixed (removed from findings) or downgraded to "suggestion" severity. Non-auto-fixable findings remain.
18. Max 2 review iterations. If after iteration 2 there are still critical findings, the page is marked `degraded_quality=True` and a warning surfaces in Studio chat: "Forge flagged some issues I couldn't fix automatically. Review before publishing." Plus the findings show as refine chips.

### Phase 6 — Non-Fixable Findings UX

19. Findings with `auto_fixable=false` don't trigger the refine loop. They appear in Studio's chat panel as assistant messages with an action:
    > **Susan Kare noticed**: The form has 9 fields. For a mobile user, that's a scroll. Want to try collapsing optional fields under "Add details"?  
    > [Try it] [Not now]
20. Clicking "Try it" sends a refine prompt derived from the `suggested_action`. Clicking "Not now" dismisses that specific finding (saved to `page_revisions.dismissed_findings` so it doesn't re-appear on re-review).
21. Multiple findings from the same expert can be grouped into one message for readability:
    > **Dieter Rams noticed 3 things**:  
    > • The hero's 14-word headline. [Shorten]  
    > • Three CTAs in the pricing section compete. [Reduce to 1]  
    > • "Family owned" repeats in intro and trust signals. [Remove from trust]  
    > [Apply all] [Dismiss all]

### Phase 7 — Voice & Brand Drift Detection

22. A separate lightweight check runs alongside the main review: does the composed page match the voice profile and brand tokens?
23. **Voice match**: a fast-tier LLM call compares a sample of the composed prose against the voice profile. Returns `{voice_score: 0-100, drift_examples: [...]}`. Voice score < 70 → adds a finding attributed to "Voice Consistency" (a synthetic expert lens).
24. **Brand drift**: deterministic checks — are any hardcoded hex colors in the output? Any font-family declarations overriding the brand fonts? Brand drift is always auto-fixable (we just re-render the ComponentTree using the brand tokens).
25. These checks run in parallel with the main expert review to avoid extending wall time.

### Phase 8 — Workflow-Specific Review Extensions

26. Some workflows have additional mandatory checks beyond the general expert review:
    - **Proposal**: math correctness (line items sum, tax, total). Mandatory sections present. Expiration date set. Legal terms present. Governed by `app/services/orchestration/review/proposal_checks.py`.
    - **Pitch deck**: slide count in range (8-15 for typical pitch), every slide has title + takeaway, chart data is non-placeholder on at least 50% of chart slides (or explicitly flagged as draft), image prompts are not empty for layouts that require them.
    - **Contact form**: submit button exists, at least one field, fields have labels, email field if contact form (vs. booking-only), slot picker wired correctly if booking is enabled.
27. These workflow-specific checks produce findings under synthetic expert lenses: "Proposal Math Checker", "Deck Completeness", "Form Integrity". Findings are almost always `auto_fixable=true` and `severity=critical` — the refiner fixes them in the first cycle.
28. Workflow-specific check modules are thin — they inspect the ComponentTree structurally. No LLM needed.

### Phase 9 — Accessibility Review

29. Accessibility is a dedicated lens with its own prompt and deterministic checks:
    - Every form field has a `<label>` or `aria-label`.
    - Every image has `alt` text.
    - Heading hierarchy is correct (one `h1`, no skipped levels).
    - Color contrast passes WCAG AA (deterministic check using brand tokens + template default styles).
    - Interactive elements have visible focus states (template responsibility — checked via CSS selector presence).
30. These findings are attributed to the lens "Accessibility" and always severity ≥ major. Most are auto-fixable (inject missing labels, generate alt text via a fast LLM call, fix heading hierarchy).
31. Accessibility violations that can't be auto-fixed (e.g., brand-token color contrast fail) surface as prominent warnings: "Your brand's accent color ({hex}) doesn't meet WCAG AA contrast on white. Forge will use a darker variant for buttons." This is design responsibility the user may want to address at the brand kit level.

### Phase 10 — Quality Metrics & Learning

32. Every review emits metrics:
    - `review.finding_count{severity}` histogram.
    - `review.quality_score` histogram.
    - `review.auto_fix_success_rate` ratio.
    - `review.iteration_count` histogram.
33. Persist the review report to `orchestration_runs.review_findings` (from O-02). Build a small admin dashboard at `(app)/admin/orchestration-quality` that shows:
    - Average quality score over time.
    - Most common findings (by expert + dimension).
    - Refine success rate per workflow.
    - Correlation between quality score and user satisfaction (when we have published + kept pages as a proxy).
34. Use this data to iterate on composer prompts. If Rams repeatedly flags "hero too wordy" across 20% of contact forms, that's a signal the contact-form composer prompt needs tighter hero constraints.

### Phase 11 — The User's "Show Me The Review" Affordance

35. In Studio, a small icon in the chat panel header reveals the full review report. Clicking opens a side drawer with the findings grouped by expert, with quality score and summary.
36. Findings in the drawer show "Fixed by Forge" badges for auto-fixed items (with a diff view on hover) and "Your call" badges for suggestions. Educational transparency.
37. Option to "Re-review" the current page at any time — useful after the user has done manual section edits and wants a fresh critique.

### Phase 12 — Degraded Mode Indicators

38. When a review cycle converges with remaining findings, the Studio artifact card shows a subtle "Quality score: 87" chip in the corner. Hover reveals the review summary.
39. Green 90+, warm yellow 75-89, soft orange 60-74, muted red below 60. Scores below 75 show a "Review findings" button right on the artifact.
40. Publishing is gated: scores below 50 require explicit user acknowledgment ("Forge thinks this page has significant issues. Publish anyway?"). Never blocked outright — user's call — but surfaced clearly.

### Phase 13 — Tests

41. Unit tests: given a ComponentTree with known issues (hero 20 words, missing CTA, 3 competing buttons), the review produces findings that match.
42. Integration tests: run the full review → refine → re-review loop, verify quality score improves.
43. Cost test: 100 reviews average < $0.05 each.
44. Latency test: reviews complete p95 < 15 seconds.
45. Evaluation fixtures: 30 hand-crafted "bad pages" with known issues and expected finding counts. CI verifies the reviewer catches them.
46. Regression test: for 20 known-good composed pages, the reviewer produces ≤ 4 findings and quality score ≥ 85.
47. Auto-fix success rate test: across 100 synthetic runs, ≥ 80% of auto-fixable findings are actually resolved in one refine cycle.

### Phase 14 — Documentation

48. Write `docs/architecture/REVIEW_PANEL.md` — the expert panel, the single-call architecture, why not seven LLM calls, how to add a new expert.
49. Write `docs/prompts/REVIEW_STYLE_GUIDE.md` — how findings should be phrased (actionable, specific, attributable).
50. Write `docs/runbooks/QUALITY_DEBUGGING.md` — when the review seems off, how to inspect the prompt trace, adjust weights, tune the panel.
51. Mission report.

---

## Acceptance Criteria

- Seven expert lenses registered with questions and dimensions.
- Single-call review produces attributed findings with correct severity and auto-fixable flags.
- Streaming findings surface in Studio chat in real-time.
- Refine loop addresses auto-fixable findings; max 2 iterations enforced.
- Non-auto-fixable findings surface as user-actionable suggestions.
- Voice and brand drift detection runs alongside main review.
- Workflow-specific checks (proposal math, deck completeness, form integrity) run deterministically.
- Accessibility findings always surface and are mostly auto-fixable.
- Quality metrics persist to orchestration_runs; admin dashboard displays aggregates.
- Quality score visible on artifact card; low scores prompt user acknowledgment.
- Cost per review < $0.05; latency p95 < 15s.
- All tests pass including evaluation fixtures.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
