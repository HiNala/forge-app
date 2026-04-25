# WORKFLOW MISSION W-03 — Pitch Deck & Slide Presentation Workflow

**Goal:** Let a Forge user describe a deck in plain English and get a scroll-or-present-able slide deck back in minutes — investor-ready pitch, product launch deck, internal strategy readout, all-hands quarterly review. The deck lives as a web-native "slides" page on Forge — readable as a scrollable document, presentable fullscreen with keyboard navigation, tracked with per-slide analytics, and exportable to PPTX/PDF for the user who needs it in a traditional tool. After this mission, a founder can stop dreading their deck; they can tell Forge what they want to say and spend their time on the pitch, not the slides.

**Branch:** `mission-w03-pitch-deck`
**Prerequisites:** BI-01 through BI-04 complete. Orchestration O-01, O-02, O-03 produce page content from structured intents. W-02 showed how to handle complex multi-section content.
**Estimated scope:** Large. New data model for decks, new composer agent, presentation mode UI, chart and visualization generation, image generation for slide backgrounds, PPTX export.

---

## Experts Consulted On This Mission

- **Steve Jobs** — *Ten slides, twenty minutes, thirty-point font. Is every slide earning its place?*
- **Edward Tufte (via Nielsen)** — *Every chart, every image — is it conveying information or taking up space?*
- **Dieter Rams** — *A slide with too much on it fails twice: too hard to read and too easy to ignore.*
- **Susan Kare** — *Does each slide have a single clear visual anchor?*
- **Tony Fadell** — *The ecosystem: writer, reader, presenter. Does the design serve all three?*

---

## How To Run This Mission

Research grounding: the "10/20/30 rule" (Guy Kawasaki) is the right default — 10 slides, 20 minutes, 30pt minimum font. Investor pitch decks almost universally follow a known pattern (problem → solution → market → traction → business model → team → financials → ask). Other decks vary but all share: a clear narrative arc, one idea per slide, and consistency across slides.

**Forge's advantage**: we're not building PowerPoint. We're building a scroll-first, web-native deck experience that *also* exports. The primary medium is the browser — which means our decks are trackable, responsive, shareable via URL, and updatable in real-time. The PPTX export is a convenience, not the destination.

Commit on milestones: deck data model, Studio generates 10-slide decks, presentation mode, per-slide section editing, charts work, image generation works, PPTX export, analytics per slide.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Deck Data Model

1. Register `pitch_deck` as a new `page_type` (already allowed in the `pages.page_type` check constraint from BI-01).
2. Create `decks`:
    ```sql
    CREATE TABLE decks (
      page_id UUID PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      deck_kind TEXT NOT NULL CHECK (deck_kind IN (
        'investor_pitch','product_launch','internal_strategy','all_hands',
        'sales_pitch','conference_talk','teaching_lecture','generic'
      )),
      narrative_framework TEXT,  -- e.g., 'problem_solution_ask', 'before_after_bridge', 'sequoia_classic'
      target_audience TEXT,
      slide_count INT NOT NULL DEFAULT 10,
      slides JSONB NOT NULL,  -- full ordered slide array (see schema below)
      theme JSONB NOT NULL,   -- derived from org brand kit + deck-specific overrides
      speaker_notes JSONB DEFAULT '{}'::jsonb,  -- {slide_id: notes}
      transitions TEXT DEFAULT 'fade' CHECK (transitions IN ('none','fade','slide','scale')),
      locked_by_user_id UUID REFERENCES users(id),
      locked_at TIMESTAMPTZ,  -- optimistic lock for collaborative edits
      last_exported_at TIMESTAMPTZ,
      last_exported_format TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
    RLS enabled.
3. Slide schema (Pydantic model stored in `slides` JSONB):
    ```python
    class Slide(BaseModel):
        id: str  # slide_xxx
        order: int
        layout: Literal[
            'title_cover','section_header','single_takeaway','two_column',
            'three_column','four_quadrant','big_number','bullet_list',
            'chart','image_full','image_with_caption','quote','team_grid',
            'timeline','comparison_table','process_flow','closing'
        ]
        title: str | None = None
        subtitle: str | None = None
        body: str | None = None  # markdown-ish; the Composer turns this into HTML
        bullets: list[str] = []
        quote: QuoteBlock | None = None
        chart: ChartBlock | None = None
        image: ImageBlock | None = None
        team_members: list[TeamMember] = []
        metrics: list[MetricBlock] = []
        footer: str | None = None  # per-slide footer override
        speaker_notes: str | None = None
        background_color: str | None = None  # hex; overrides theme
        accent_color: str | None = None
    ```
4. Every slide gets a unique ID at generation time (shortid). Section-edit operations target a slide by ID, not by index — makes reordering safe.

### Phase 2 — Narrative Frameworks (the Skeletons)

5. Create `app/services/orchestration/deck/frameworks.py` with pre-defined frameworks. Each framework is a list of `{layout, role, hint}` tuples:
    ```python
    SEQUOIA_PITCH = [
        ("title_cover",       "title",       "Company name + tagline"),
        ("single_takeaway",   "problem",     "What pain are you solving?"),
        ("single_takeaway",   "why_now",     "Why is this the right moment?"),
        ("single_takeaway",   "solution",    "What do you do in one sentence?"),
        ("big_number",        "market_size", "TAM / SAM / SOM"),
        ("chart",             "competition", "Market map or 2x2"),
        ("bullet_list",       "product",     "Key features / differentiators"),
        ("three_column",      "business_model","How you make money"),
        ("chart",             "traction",    "Growth chart or metrics"),
        ("team_grid",         "team",        "Founders + advisors"),
        ("single_takeaway",   "ask",         "How much you're raising, for what"),
        ("closing",           "close",       "Contact + next step"),
    ]
    ```
6. Build the set: `SEQUOIA_PITCH`, `Y_COMBINATOR_PITCH`, `NFX_PITCH`, `PRODUCT_LAUNCH`, `INTERNAL_STRATEGY`, `ALL_HANDS`, `SALES_PITCH`, `CONFERENCE_TALK`, `BEFORE_AFTER_BRIDGE` (classic persuasive structure), `GENERIC_10`. Each framework is ~8–14 slides.
7. The intent parser maps user intent ("I'm raising a Series A") to the best framework. Falls back to `GENERIC_10` if uncertain and offers a framework switcher in the Studio chat panel.

### Phase 3 — Deck Composer Agent

8. Create a `DeckComposer` agent in the orchestration layer (full agent details in O-03). Responsibilities:
    - Takes deck intent + framework + any source context (website URL, business plan PDF, existing notes).
    - Produces a complete 10–14 slide deck in the slide schema above.
    - Every slide has title, body/content, speaker_notes.
    - Charts include chart_data (real numbers if available, plausible placeholders otherwise — clearly marked as `is_placeholder: true` in metadata).
    - Images specify prompts but don't generate them yet (Phase 6 handles image gen).
9. The composer runs in TWO stages to preserve narrative coherence:
    - **Stage A (outline):** produce the full deck as a structured skeleton — titles, one-line takeaways, rough body hints. This is fast (1 model call with reasonable context).
    - **Stage B (expand):** expand each slide in parallel (batched 4-wide) into full content — body prose, bullets, quote text, chart data.
    - This structure catches narrative drift: Stage A has to commit to the story arc before Stage B can freelance with word-level content.
10. Style guidance baked into the composer's system prompt:
    - "Every slide should pass the 6-word test: the main point can be stated in 6 words or fewer."
    - "Bullet lists have 3-5 items. Never 7. Never 2."
    - "Numbers are rounded and readable. Say '$2.4M', not '$2,437,892'."
    - "Speaker notes are what the presenter would SAY, not what the slide should say. 2-4 sentences per slide."

### Phase 4 — Rendered Deck HTML

11. The Composer's rendered HTML is a single scrollable page, NOT a PPTX-style paginated experience. Each slide is a `<section data-forge-slide="slide_123" data-layout="big_number">` with fixed proportions (16:9) on desktop, scaled to fit.
12. Slide layouts are Tailwind components. Examples:
    - **title_cover**: giant Cormorant Garamond title, small subtitle, logo in corner, warm cream background or branded gradient.
    - **big_number**: a single very large number (120pt) with a short caption beneath.
    - **bullet_list**: title + 3-5 bullets, each bullet with an icon + one-line body.
    - **chart**: title + chart region (renders via Chart.js or Recharts client-side). Chart data in a `<script type="application/json">` next to the canvas element.
    - **team_grid**: 2x2 or 3x3 grid of team members with headshot + name + role + one-line bio.
    - **quote**: giant quotation mark, quote text in Cormorant italic, attribution below in Manrope.
13. Each slide has:
    - A stable ID in the URL fragment (`#slide-3`).
    - A "slide number" in the bottom-right (e.g., "3 / 12").
    - Speaker notes rendered below in a subtle secondary section (hidden by default; shown when `?notes=true` or in presenter mode).
    - Accessibility semantics: `<section role="region" aria-labelledby="slide-3-title">`.
14. The scrollable deck uses CSS scroll-snap: `scroll-snap-type: y mandatory` + `scroll-snap-align: start` on each slide. Feels like slides, reads like a doc.

### Phase 5 — Presenter Mode

15. Add a "Present" button on the Page Detail for deck pages. Clicking opens `/p/{slug}?mode=present` in a new tab.
16. Presenter mode:
    - Fullscreen layout (requests browser fullscreen on click).
    - Arrow keys or spacebar advance. Left arrow / backspace go back. Esc exits.
    - Optional: "Presenter view" on a second monitor showing current slide + next slide preview + speaker notes + a timer — triggered via a URL flag `?presenter=true`.
    - Transitions respect `transitions` field on the deck (fade/slide/scale/none). Framer Motion handles animations.
    - Clicking advances to the next slide (for remote-click use cases).
    - Small UI chrome in the corners (slide count, exit fullscreen) that auto-hides after 2 seconds of inactivity.
17. The fullscreen request is a gesture-initiated browser API call. Fallback when user denies: the presentation fills the viewport without actual OS fullscreen.
18. Keyboard shortcuts cheatsheet modal on `?` press.

### Phase 6 — Image Generation & Backgrounds

19. Some slide layouts call for visuals: `image_full`, `image_with_caption`, `title_cover` with a hero image. The Composer includes an `image.prompt` on these slides rather than generating up-front.
20. After the deck is composed, a background job `deck_image_generation` fans out parallel image generation calls for each slide with a pending image prompt. Provider-abstracted (OpenAI DALL-E 3, Gemini Imagen, or a self-hosted Stable Diffusion via Replicate) with the default decided per-org in settings.
21. Generated images stored to S3 with the page/slide context. Slide is updated to point at the storage URL; the public page re-caches.
22. Progressive rendering: the Studio preview shows the slide with a warm shimmer placeholder until the image arrives, then fades in. The user can publish before images complete — published slides show placeholders until worker catches up.
23. Image style consistency: the deck's first image prompt includes style anchors ("photorealistic, warm lighting, modern office" or "flat illustration, muted palette, geometric"). Subsequent prompts inherit those anchors so the deck feels visually cohesive.
24. User can override any generated image in the Studio: click the image, choose "Regenerate with different prompt", "Upload my own" (uses the file-upload flow from BI-03), or "Remove".

### Phase 7 — Charts & Data Visualization

25. Slides with `layout: chart` include a `ChartBlock` specifying chart type, axes, series, colors. The Composer picks reasonable chart types for the content: bar for comparisons, line for time series, pie for composition (rarely — pies are hard), area for cumulative.
26. Chart data is generated as plausible numbers WITH a `is_placeholder: true` flag and a `source_hint` like "Replace with your actual Q1–Q4 ARR numbers." Placeholders are visually marked in Studio (a subtle "Draft data" chip next to the chart) — not on the published deck (which assumes the user has replaced them).
27. A dedicated "Chart editor" side panel in Studio: click any chart in the preview to open a small spreadsheet-like table where the user can paste in real data. Changes instantly re-render. No AI needed for pure data replacement.
28. Accessibility: every chart has an auto-generated data table below it (visually hidden, screen-reader accessible) containing the same numbers.

### Phase 8 — Studio UX for Decks

29. When the intent parser detects a deck, Studio's preview pane shows:
    - Thumbnail rail on the left (each slide as a small preview card with its number and title; current slide highlighted).
    - Click a thumbnail to scroll to that slide in the main preview.
    - Drag-and-drop reorder thumbnails — updates `slides[].order` in the DB and re-renders.
    - "Add slide" button between any two thumbnails; opens a small menu to pick a layout. Fires a targeted LLM call that drafts content for the new slide given its neighbors' context.
    - "Delete slide" action on each thumbnail (with undo toast).
30. Refine chips for decks:
    - "Make the pitch more technical"
    - "Focus more on traction"
    - "Add a slide about pricing"
    - "Remove the competition slide"
    - "Shorter — cut to 8 slides"
    - "Longer — expand to 14 slides"
    - "Change to the YC framework"
31. Section-click editing still works per-slide. Click the problem slide, open the edit popup, prompt "Make this more emotional — lead with the user's frustration, not the market stats." The fast-tier LLM rewrites JUST that slide.

### Phase 9 — Speaker Notes Surface

32. Speaker notes live on each slide as a field. In Studio, notes are visible in a collapsible area below the main preview. In presenter mode, notes drive the "presenter view" second monitor.
33. A dedicated "Speaker notes mode" in Studio (toggle in top bar): flips the entire preview to a reading view with just speaker notes per slide — useful for pre-presentation rehearsal. The user can edit notes directly in this mode with autosave.
34. A "Generate speaker notes" action for slides missing them: runs a fast-tier LLM call given the slide's content + the deck's target audience, writes 2-4 sentence notes.

### Phase 10 — PPTX / PDF Export

35. `POST /api/v1/pages/{page_id}/deck/export` — payload: `{format: 'pptx'|'pdf'|'keynote'|'google_slides'}`. Enqueues a worker job.
36. **PPTX export** uses `python-pptx` in the worker:
    - Maps each deck layout to a PPTX slide layout.
    - Creates text boxes with matched fonts (Cormorant / Manrope — embeds the font files).
    - Renders charts via the python-pptx chart API (produces native editable charts, not images).
    - Embeds images from S3.
    - Writes speaker notes to the PPTX notes pane.
    - Outputs a `.pptx` stored in S3. The user downloads via a signed URL returned in the API response (or emailed).
37. **PDF export** uses Playwright to render the deck in presentation mode, one slide per page, with `media: 'print'` CSS. Faster than PPTX, visually pixel-perfect.
38. **Google Slides export**: via the Google Slides API if the org has the Google integration connected. Creates a new presentation in the user's Drive, populates slides using batch update. Returns the Google Slides URL.
39. Export respects the user's plan: Starter gets PDF only, Pro gets PPTX + PDF, Enterprise gets everything including Google Slides.
40. Track exports: increment `use_count`, update `last_exported_at`, write an `audit_log` entry.

### Phase 11 — Presenter Analytics

41. Presenter mode fires special events to the analytics tracker:
    - `present_started` when fullscreen is engaged.
    - `present_slide_viewed` each time a slide becomes current (with time on previous slide).
    - `present_ended` on exit with total duration.
42. The Page Detail's Analytics tab for decks shows:
    - **Presentation sessions** — list of past presentations with duration, slides viewed, average time per slide.
    - **Reader sessions (non-presentation)** — same but for users who scrolled through the deck like a document.
    - **Slide dwell heatmap** — which slides get the most time across all sessions. Surfaces the "confusing slide" (where readers linger) and the "skipped slide" (where readers blow past).
    - **Export count** — how many times the deck has been exported, to which formats.
    - **Share tracking** — if the deck was shared via unique tracked links, show who viewed (if email-gated).
43. Optional "viewer gate": the deck can be configured to require an email before viewing (shown on the Page Detail's Settings tab). Useful for investor pitches — you want to know who's reading.

### Phase 12 — Version History & Collaboration

44. Every save creates a `page_revisions` entry with `edit_type = 'deck_edit'` and a snapshot of the entire slides JSON.
45. Restore flow: click any revision in the revision drawer, preview it, click "Restore" — creates a new revision that's a copy of the target.
46. Optimistic locking: when a user opens the deck for editing, `locked_by_user_id` and `locked_at` get set. If another user of the org opens the same deck, they see a banner "{other_user} is editing — view only." Lock times out after 10 min of inactivity. Manual "Take over" button available.
47. No realtime multi-cursor editing in MVP (too complex). Single-writer lock is sufficient for most org workflows.

### Phase 13 — Templates & Gallery

48. Ship a curated set of deck templates seeded into the global `templates` table (`page_type='pitch_deck'`): 5 investor pitch variants, 3 product launch, 2 internal strategy, 2 sales. Each complete with realistic placeholder content.
49. When a user picks a deck template from the gallery, the "Use template" flow clones the deck into their org, applies their brand kit, and opens in Studio for personalization.
50. Feature the most-used deck templates prominently on the templates gallery landing page.

### Phase 14 — Tests

51. Test: a generic deck-generation prompt produces a valid slide array with all required fields per slide.
52. Test: each narrative framework produces slides in the right order with the expected slots filled.
53. Test: chart rendering client-side works for every chart type with hand-crafted data.
54. Test: presenter mode keyboard nav works, arrow keys advance, Esc exits.
55. Test: PPTX export produces a valid file (read back with `python-pptx`, verify slide count + titles match).
56. Test: PDF export is page-per-slide, has fonts embedded, passes a visual-regression snapshot test.
57. Test: image generation worker retries on provider failure, falls back to a secondary provider if configured.
58. Test: edit a single slide via section-edit, verify only that slide's JSON changes, rest is byte-identical.
59. Test: analytics events fire correctly in presentation mode.
60. End-to-end demo: prompt Studio with "investor pitch for my AI coffee shop app", refine a couple of slides, export to PDF, present fullscreen.

### Phase 15 — Documentation

61. Write `docs/workflows/PITCH_DECK.md` — concepts, examples, narrative frameworks explained.
62. Write `docs/runbooks/DECK_EXPORT.md` — how to debug PPTX issues, font embedding, chart rendering.
63. Mission report.

---

## Acceptance Criteria

- User can generate a polished 10–14 slide deck from a plain-English prompt in under 5 minutes.
- Narrative frameworks produce structurally correct decks for each kind.
- Every slide layout renders correctly in both scroll and presentation mode.
- Image generation works with progressive rendering and consistent style.
- Charts render from real or placeholder data, editable via a chart panel.
- PPTX and PDF export both produce high-fidelity files with embedded fonts.
- Presenter mode has full keyboard nav, fullscreen, and optional presenter view.
- Per-slide analytics capture scroll and present sessions distinctly.
- Template library includes 12+ curated starter decks.
- All tests pass; end-to-end demo works.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
