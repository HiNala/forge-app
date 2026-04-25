# ORCHESTRATION MISSION O-03 — The Expert Composer Agents

**Goal:** Give Forge's AI a soul. Build the specialized composer agents that take a `PagePlan` from O-02 and turn it into a real, beautiful, on-brand, finished web page — each agent with a distinct expert system prompt written in the voice of the world's best designers. A "Contact Form Composer" trained to think like a hospitality designer who loves Atkinson's delight and Systrom's friction-elimination. A "Proposal Composer" trained like a trusted architect-contractor who writes scope like Rams wrote product copy. A "Deck Composer" trained like Jobs + Kawasaki + Tufte. Each agent receives a rich system prompt, the `PagePlan`, the `ContextBundle`, and produces a final HTML page plus structured metadata. After this mission, Forge's output is no longer "AI-generated" in the pejorative sense — it's designed.

**Branch:** `mission-o03-composer-agents`
**Prerequisites:** O-01 and O-02 complete. Provider abstraction works; context gathering delivers bundles; the graph pipeline invokes the composer node.
**Estimated scope:** Large. Each composer is a carefully tuned agent with its own system prompt, component library, and validation. Quality of output is the entire point of this mission.

---

## Experts Consulted On This Mission

- **Jonathan Ive** — *Is every element earned? Is subtraction the primary tool?*
- **Dieter Rams** — *Less, but better. Is every word doing work?*
- **Susan Kare** — *Visual clarity at every scale.*
- **Bill Atkinson** — *Does this feel alive? Does it reward attention?*
- **Edward Tufte (via Nielsen)** — *Data ink ratio. Every pixel, every character, every pixel.*
- **Steve Jobs** — *The core idea, and everything else cut.*
- **Jakob Nielsen** — *Will the user accomplish their task without confusion?*

---

## How To Run This Mission

The composers are where Forge's taste lives. A mediocre composer with a great pipeline still produces mediocre pages. A great composer can produce extraordinary pages even with a mediocre pipeline. Spend the time here.

Each composer's system prompt reads like a letter from a master to their apprentice. It's long (2000-4000 tokens), specific, opinionated, and includes annotated examples. Prompts are stored in `apps/api/app/services/llm/prompts/composers/` and versioned. Changes to any composer prompt require updated fixtures in `apps/api/tests/prompts/composers/` and pass an evaluation harness before they merge.

The composers output **semantic HTML with a known component vocabulary** — not free-form divs. This lets downstream agents (reviewer, section-editor, analytics tracker) operate on a predictable structure.

Commit on milestones: component library catalog, shared composer scaffolding, contact-form composer, proposal composer, deck composer (which is special because of per-slide fan-out), landing/menu/other composers, evaluation harness green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Component Library (The Composers' Building Blocks)

1. Create `apps/api/app/services/orchestration/components/` — a Python module registering named HTML components that composers reference by name. Each component is a Jinja2 template producing semantic HTML with Forge's design tokens.
2. Catalog components into families:
    - **Heroes**: `hero_full_bleed`, `hero_split`, `hero_centered_minimal`, `hero_with_media`.
    - **Content**: `paragraph_block`, `bullet_block`, `quote_pullout`, `numbered_steps`, `definition_list`.
    - **Forms**: `form_stacked`, `form_two_column`, `form_inline`, `form_wizard`.
    - **Form fields**: `field_text`, `field_email`, `field_phone`, `field_textarea`, `field_select`, `field_radio_chips`, `field_checkbox_grid`, `field_file_upload`, `field_date`, `field_time`, `field_address`, `field_slot_picker` (the booking widget from W-01).
    - **Trust & proof**: `testimonial_card`, `testimonial_carousel`, `logo_wall`, `rating_line`, `license_badge`, `years_in_business_badge`.
    - **CTAs**: `cta_primary`, `cta_button_with_subtext`, `cta_two_options`, `cta_full_width`.
    - **Pricing**: `price_card`, `price_table`, `line_items_table`, `price_summary_block`.
    - **Proposal-specific**: `proposal_cover`, `scope_phase_card`, `terms_accordion`, `signature_block`.
    - **Deck-specific**: `slide_*` — one per layout from W-03.
    - **Footers**: `footer_minimal`, `footer_with_contact`, `footer_legal`.
3. Each component takes typed inputs (Pydantic model). The composer agent fills these inputs with content. The template renders the final HTML.
4. Components are token-cheap for the LLM: the composer only writes JSON describing "which components, in what order, with what content." The actual HTML rendering happens deterministically from templates. This separates the LLM's job (content + structure) from the rendering engine's job (HTML + styling) — saving thousands of tokens per generation and eliminating the class of errors where the LLM produces malformed HTML.
5. Example of a composer's output (JSON):
    ```json
    {
      "components": [
        {
          "name": "hero_split",
          "props": {
            "title": "Get a quote for your project in 24 hours",
            "subtitle": "Reds Construction has been serving Rohnert Park since 2003.",
            "image_ref": "from_brand_kit.logo",
            "cta": {"text": "Describe your project", "anchor": "#contact-form"}
          },
          "data-forge-section": "hero"
        },
        {"name": "form_stacked", "props": {...}, "data-forge-section": "form"},
        ...
      ]
    }
    ```
6. The rendering engine walks this structure and produces the final HTML. Components can compose components (e.g., `form_stacked` renders a list of `field_*` inside it). Deep nesting is explicit; the LLM doesn't invent structure.
7. **Critical for extensibility**: adding a new component is a small PR — add the Jinja template, add the Pydantic props model, register in the catalog. Composer system prompts auto-regenerate their "available components" section from the catalog on API startup.

### Phase 2 — Shared Composer Scaffolding

8. Create `app/services/orchestration/composer/base.py` with `BaseComposer`:
    ```python
    class BaseComposer:
        role: str = 'composer'  # routes to heavy-tier LLM
        workflow: WorkflowType
        system_prompt_file: str
        
        async def compose(self, plan: PagePlan, context: ContextBundle, emitter: EventEmitter) -> ComposedPage:
            system = self._build_system_prompt(plan, context)
            user = self._build_user_prompt(plan, context)
            result = await llm_router.structured_stream(
                role=self.role,
                system_prompt=system,
                user_prompt=user,
                schema=ComponentTree,
                emitter=emitter,
                on_partial=self._handle_partial,
            )
            html = self._render(result.tree, plan.brand_tokens)
            metadata = self._extract_metadata(result.tree)
            return ComposedPage(html=html, tree=result.tree, metadata=metadata)
    ```
9. `_build_system_prompt` injects the workflow's system prompt file + the `available components` catalog + the brand tokens + the voice profile + the page plan summary.
10. `_handle_partial` fires `compose.section` SSE events as each top-level component's JSON completes (the streaming structured output lets us detect component boundaries during generation). The frontend receives these and updates the preview iframe section-by-section — "watching the page build itself."
11. `_render` invokes the Jinja templates to assemble final HTML.
12. `_extract_metadata` pulls out anything the downstream needs: form_schema (for Phase validation), title, description, og:image hint, section map for analytics tracking.

### Phase 3 — Contact Form Composer System Prompt

13. Create `apps/api/app/services/llm/prompts/composers/contact_form.v1.md`. Its content reads like this (this is a condensed excerpt — the real file is 3000-4000 tokens):
    ```markdown
    # Role
    You are a master designer of small-business contact pages. Your work has been compared to the best of Stripe's sign-up flow, Notion's trial pages, and the kind of single-page brochures a 20-year-old hospitality designer in Tokyo might produce. You have three teachers whose voices live in your head:
    
    - **Steve Jobs**: "The core idea, and everything else cut." Every element must earn its place.
    - **Bill Atkinson**: "Software should feel alive." Small delights, never at the cost of clarity.
    - **Jakob Nielsen**: "The user must succeed." Make the task obvious; make success feel inevitable.
    
    You are composing a contact page for a specific business. You have their brand tokens, their voice profile, and the plan for the page.
    
    # Your job
    Produce a `ComponentTree` JSON that, when rendered, is a page the business's owner would pay to have a human designer build.
    
    # Non-negotiables
    - **One primary action**. Every contact page has ONE thing the visitor should do. Usually: submit the form. Design the whole page toward that moment.
    - **Form is below the fold only if there's a reason to scroll first**. If the visitor already trusts the business (returning customer, referral), the form should be visible on load. If they don't (cold landing), earn trust above the form.
    - **Every field justified**. If a field doesn't materially help the business respond to the inquiry, don't include it. A "how did you hear about us?" is marketing research, not customer service — skip it by default.
    - **Phone numbers formatted automatically**. Use `field_phone` which auto-formats.
    - **Address only if relevant**. A virtual service business doesn't need an address field. A fence contractor does.
    - **Success state designed**. The form's success state is part of the design. Don't leave the user staring at an empty page.
    
    # Voice
    The business's voice profile is:
    {{ voice_profile_summary }}
    
    Match it. If they're formal, be formal. If they're warm and local, be warm and local. Never be performatively "AI polite" — say "Let's hear about your project" not "We would be delighted to learn more about your project."
    
    # Structure (your default)
    1. Hero — single clear headline, the specific thing they offer, the clear benefit.
    2. Intro (optional, only if trust is needed) — 1 paragraph, max 40 words.
    3. Form — stacked, 5-7 fields max, each labeled clearly.
    4. (If calendar context) — `field_slot_picker` immediately after core fields for time selection.
    5. Trust signals — only if the business has them (license, years, testimonials). Never invent these.
    6. Footer — minimal, contact fallback (phone/email for people who don't use forms).
    
    # Forbidden
    - Stock phrases: "elevate your business", "seamless experience", "cutting-edge solutions".
    - Emoji in headlines (acceptable in button labels for playful brands, never for formal).
    - Form fields the brief didn't specify unless they're obviously useful.
    - Dense paragraphs of explanation. If you need a paragraph, you haven't thought hard enough about what goes in the hero headline.
    
    # How to decide what gets in the hero
    Apply Jobs' rule. What's the ONE thing? Usually: a confidence-inspiring promise + the specific offering.
    
    ✅ "Get a free quote in 24 hours — fence installation across Sonoma County"
    ❌ "Welcome to Reds Construction, your trusted local fence experts since 2003"
    
    The first sentence tells Dan what he gets. The second talks about Lucy.
    
    # Examples of excellent work (study these before composing)
    [... 3-4 annotated examples in ComponentTree JSON, each paired with a 1-paragraph commentary on why it works ...]
    
    # Output format
    Respond with a single JSON object matching the `ComponentTree` schema. No commentary, no explanation, no markdown around the JSON — the caller parses directly.
    ```
14. The prompt includes 3–4 hand-crafted exemplar outputs (real example businesses: a contractor, a tutor, a photographer, a cafe) with annotations. These are the single most important part of the prompt — LLMs imitate what they see. Invest in these examples.
15. The prompt is versioned: changes create `contact_form.v2.md`, run A/B eval on fixtures, promote if better.

### Phase 4 — Proposal Composer System Prompt

16. Create `composers/proposal.v1.md`. The voice is different — this is a legal-adjacent document:
    ```markdown
    # Role
    You are a composer of contractor proposals in the style of a trusted architect who has been in business for 30 years and writes proposals clients actually read. Your teachers:
    
    - **Dieter Rams**: "Less, but better." Every sentence does work.
    - **Don Norman**: "The user forms a mental model — you must help, not hinder."
    - **Susan Kare**: "Visual clarity at every scale." The proposal scannable in 30 seconds; dense on request.
    
    # Your job
    Produce a proposal that wins the job because it's the clearest one the client has ever seen, not because it's the cheapest or the most decorated.
    
    # Non-negotiables
    - **Every proposal includes ALL of these sections, in this order, no exceptions**:
      1. Cover (proposal number, date, client name, project name, expiration)
      2. Executive summary (3-5 sentences, what you're doing and why you)
      3. Scope of work (phases with deliverables)
      4. Exclusions (what's NOT in scope — prevents disputes later)
      5. Line items / pricing (grouped, with category subtotals)
      6. Timeline (milestones with dates or ranges)
      7. Terms & warranty
      8. Payment schedule
      9. Acceptance block
    - **Numbers are ALWAYS accurate**. The pricing math in line items must sum to the subtotal the composer emits. If tax_rate_bps is provided, tax = subtotal * tax_rate_bps / 10000. Totals round to cents. Never invent numbers; use the brief's data.
    - **Exclusions section is REQUIRED**. Even if the brief doesn't specify, add defensible defaults (permits, debris removal, tear-out of existing, site prep). Better to over-communicate than be sued later.
    - **Warranty and change-order language present**. Use boilerplate from the legal library unless the brief overrides.
    
    # Voice
    Match the business's voice profile: {{ voice_profile_summary }}. But note: proposals always skew slightly more formal than the business's general voice. A casually-branded contractor should still say "The project will proceed in three phases" not "So, here's how we'll do it."
    
    # Forbidden
    - Hedging: "approximately", "roughly", "we'll try to". A proposal is a commitment. Say "3 business days" not "approximately 3 business days".
    - Buzzwords: "turnkey solution", "best-in-class", "synergies".
    - Implicit scope. If the deck repair includes railings or not — state it explicitly in Scope or Exclusions.
    - Missing expiration dates.
    
    # Structure guidance
    - **Scope phases** are 3-6 items. Each with a 2-3 word title, 1-sentence description, and 2-5 deliverables. Never one monolithic block.
    - **Line items** group by category: Materials, Labor, Equipment, Subcontractors, Other. Subtotals per category.
    - **Timeline** uses either dates or durations consistently — don't mix.
    
    # Examples
    [... 2-3 exemplar proposals, one residential, one commercial, one renovation, with annotations ...]
    
    # Output format
    [ComponentTree JSON format]
    ```
17. This composer uses a specialized `ProposalComponentTree` Pydantic model with strongly-typed fields for line_items, timeline milestones, etc. Pricing math runs server-side — the LLM produces numbers, the renderer recomputes subtotals from line items and flags any mismatch with `degraded_quality=True` on the graph state.

### Phase 5 — Deck Composer System Prompt

18. Create `composers/pitch_deck.v1.md`. The deck composer is special because it operates in TWO stages (per W-03): outline + per-slide expand.
19. **Outline stage prompt** (`composers/pitch_deck_outline.v1.md`):
    ```markdown
    # Role
    You are a slide strategist. You've built decks for Stripe, Airbnb, Figma at their earliest stages. Your teachers:
    
    - **Steve Jobs**: "Ten slides, twenty minutes, thirty-point font." Kawasaki's rule; honor it.
    - **Edward Tufte**: "Clutter is a failure of design." Every slide has one idea.
    - **Guy Kawasaki**: "Problem, solution, business model, underlying magic, marketing plan, competition, management team, financials, status, summary." (The classic pitch arc.)
    
    # Your job
    Produce a slide-by-slide outline — titles, one-sentence takeaways, speaker-note hints, chart/image notes. Do NOT write full body prose yet. The next stage will expand each slide.
    
    # Structure
    The planner has given you a framework: {{ framework_name }}. Follow its slot plan. Each slot has a role (problem, solution, market, traction, team, ask) and a layout suggestion (big_number, bullet_list, chart, quote, etc.).
    
    For each slot, output a slide skeleton:
    - `title`: the slide's single clear idea, 2-6 words.
    - `takeaway`: the one sentence a viewer would remember.
    - `data_hints`: if chart, what chart. If big_number, the number. If quote, the speaker.
    - `image_hint`: if image, a prompt for the illustrator.
    - `speaker_note_hint`: 2-3 words the speaker would say.
    
    # Forbidden
    - Slides without a clear takeaway ("Our Company" is not a takeaway).
    - More than 6 bullets on any slide.
    - Jargon the average investor wouldn't know without explanation.
    - Claims without evidence. If you say "growing 40% MoM", the next slide shows the chart.
    
    # Examples
    [... 2 exemplar outlines: an early-stage Series A, a product launch ...]
    ```
20. **Expand stage prompt** (`composers/pitch_deck_slide_expand.v1.md`): narrower prompt, per slide. Takes a single slide skeleton + surrounding context (previous slide, next slide titles) and produces the full `Slide` model.
21. The orchestration graph's deck-specific branch runs outline → parallel expand (batches of 4 concurrent slide expansions) → image prompts → assemble.
22. Cost optimization: expand stage uses fast-tier model; outline uses heavy-tier (the strategic decisions matter more than the prose).

### Phase 6 — Landing, Menu, RSVP, Other Composers

23. Create composers for the remaining workflows, each with its own specialized system prompt:
    - `landing.v1.md` — sales landing page composer. Teachers: Fadell, Systrom, Rams.
    - `menu.v1.md` — restaurant menu / service menu composer. Teachers: Kare, Tufte.
    - `event_rsvp.v1.md` — event RSVP composer. Teachers: Atkinson, Nielsen.
    - `gallery.v1.md` — image gallery composer. Teachers: Ive, Kare.
    - `promotion.v1.md` — promotional / discount page composer. Teachers: Systrom, Spiegel.
    - `generic.v1.md` — fallback composer when intent doesn't match any specialized one.
24. Each composer prompt is 2000-3500 tokens. Each has 2-4 annotated exemplars. Each has a "non-negotiables" section and a "forbidden" section.
25. These don't all have to be masterpieces on day one — the specialized Contact / Proposal / Deck composers get the most attention because they're the flagship workflows. The others are competent-but-not-exceptional at launch; we invest more in the ones that see usage.

### Phase 7 — Refine & Section-Editor Composers

26. The refiner (invoked after the reviewer in the graph) uses a specialized prompt `composers/refiner.v1.md`:
    ```markdown
    # Role
    You are a precision editor. You've received a page, a set of review findings, and you must address EACH finding without making any other change. You don't improve the page — you fix exactly what's flagged.
    
    # Constraints
    - Change ONLY the sections flagged by the reviewer.
    - Preserve every other byte of the input.
    - Output the full ComponentTree with your changes applied.
    ...
    ```
27. The section-editor (for user-driven section edits in Studio) uses `composers/section_editor.v1.md`. Takes: current section ComponentTree, user's refine prompt, brand/voice context. Produces: new section ComponentTree. Operates under a tight token budget (~2000 tokens max) for speed.
28. Both refiner and section-editor use the fast-tier LLM.

### Phase 8 — Voice Matching

29. Every composer's system prompt reads the voice profile and injects it into the final composed content. The injection strategy:
    - The voice profile summary goes at the TOP of the system prompt, before structural rules. Primacy effect.
    - "Signature phrases" from the voice profile are allowed to appear in the output. "Avoid phrases" are explicitly named in the forbidden section.
    - The `formality` level maps to default prose style: `low` → contractions, sentence fragments OK; `high` → complete sentences, no contractions, formal register.
    - The `readability_target` tunes sentence length: grade 5 = ≤12 words/sentence average; grade 16 = ≤24 words/sentence average.
30. Voice drift detection: the reviewer (in O-04) checks whether the composer's output actually matches the voice profile and flags mismatches. Loop back to refine.

### Phase 9 — Brand Token Application

31. Brand tokens pass through the `ComponentTree` render step. The templates are parameterized by the brand tokens — primary color becomes `var(--brand-primary)`, which Jinja replaces with the hex value at render time.
32. Brand consistency is enforced at the TEMPLATE level, not in the LLM's output. The LLM says "use hero_split" and the template controls colors/fonts. This prevents the LLM from going rogue on color choices.
33. Font loading: the rendered HTML's `<head>` includes `@font-face` declarations for the brand fonts (from Google Fonts, self-hosted where possible for performance). If the brand fonts aren't web-available, falls back to a designated pairing ("Cormorant Garamond" display + "Manrope" body by default).

### Phase 10 — Content Safety

34. Every composed output passes through a safety filter before the validator:
    - No profanity in headlines/body (unless the brief explicitly requests it, e.g., an edgy brand).
    - No unverifiable claims ("the #1 contractor in California" without evidence in context).
    - No PII exposed beyond what the user intended.
    - No references to competitor brand names unless in comparison sections.
    - No dark-pattern language ("Only 2 seats left!" when we have no evidence) — unless actually true per org settings.
35. Safety violations are flagged to the refiner rather than failing the pipeline outright. The user sees a chip in chat: "Removed an unverified claim — added later if you have data."

### Phase 11 — Evaluation Harness

36. Create `apps/api/tests/prompts/composers/fixtures/` with evaluation fixtures. Each fixture:
    - A realistic input: `{plan, context_bundle, expected_properties}`.
    - `expected_properties` is a list of assertions: `"hero_exists": True`, `"has_form_with_email_field": True`, `"word_count_hero < 30"`, `"voice_match_score > 0.75"` (voice match scored by a separate LLM-based evaluator).
37. A CI harness runs each fixture against the current composer prompt version at temperature 0 (for reproducibility). Any property failure blocks merge. Expected failures must be explicitly marked (to catch real regressions while permitting known-limitations).
38. 20-50 fixtures per composer. Mix of workflow variants, voice profiles, edge cases (empty brand kit, no website URL, extreme density setting).
39. Harness outputs a `composer_eval_report.md` checked into the repo — historical record of composer performance over time.

### Phase 12 — Tests

40. Unit tests for each rendering template (Jinja → HTML correctness).
41. Integration tests for each composer: fake LLM response → compose → validate HTML structure.
42. Property tests:
    - Every compose for every workflow includes the workflow's mandatory sections.
    - Every form output has unique field IDs.
    - Every proposal's line items sum to the stated subtotal.
    - Every deck has the requested slide count ±1.
43. Snapshot tests for the component catalog: render each component with canonical props, commit the HTML snapshot. Changes to templates force a snapshot update with explicit review.
44. Performance test: compose a typical contact form under 6 seconds p95; proposal under 10s; 10-slide deck under 20s.
45. Cost test: 100 random composes average < $0.06 each for contact/form workflows, < $0.12 for proposals, < $0.25 for decks.

### Phase 13 — Documentation

46. Write `docs/architecture/COMPOSERS.md` — the composer architecture, the two-stage pattern for decks, how to add a new workflow composer.
47. Write `docs/prompts/COMPOSER_STYLE_GUIDE.md` — the house style for composer system prompts. The format, the teacher-voice pattern, the exemplar requirements.
48. Mission report.

---

## Acceptance Criteria

- Component library catalog has 40+ components across all categories.
- All specialized composers (contact_form, proposal, pitch_deck, landing, menu, event_rsvp, gallery, promotion) have production-ready system prompts with exemplars.
- Every composer produces valid `ComponentTree` JSON that renders to valid HTML.
- Voice profile influences output measurably (eval harness voice match score ≥ 0.75).
- Brand tokens apply correctly via templates.
- Proposal math is exact (server-validated).
- Deck two-stage composition works end-to-end.
- Content safety filter catches unverified claims and profanity.
- Evaluation harness runs in CI with 20+ fixtures per composer.
- Performance and cost targets hit.
- All tests pass.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
