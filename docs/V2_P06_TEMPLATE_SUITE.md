# V2 MISSION P-06 — Template & Workflow Expansion: The Full Mini-App Suite

**Goal:** Expand Forge from six workflows (mobile, web page, contact form, proposal, pitch deck, landing page) to a complete suite of mini-app types covering nearly every "I need a quick page for this" job a small business or solo professional has. Add the workflows people would otherwise reach for Typeform, Canva, Calendly, Carrd, Beacons, or Linktree to handle. Build a curated template library that's the on-ramp for new users — pick a template, customize the words and brand, ship in three minutes. After this mission, when a stranger asks "can Forge make X?", the answer is yes for the dozen most common asks.

**Branch:** `mission-v2-p06-template-suite`
**Prerequisites:** V2-01 through V2-05 complete. The strategic reframe is positioned. The two new canvases (mobile, web) are operational. The orchestration layer handles the existing six workflows. The pricing model is in place.
**Estimated scope:** Medium-large. The framework for adding new workflows already exists (W-04 documented it). The work here is genuinely additive — registering new workflows, building their composers, seeding their templates, adding marketing pages.

---

## Experts Consulted On This Mission

- **Tony Fadell** — *Each new workflow is a complete loop. Don't ship a workflow that doesn't have its before, during, and after designed.*
- **Steve Krug (Don't Make Me Think)** — *A user picking a template should never wonder "what does this make?" The template names + thumbnails answer the question.*
- **Linktree / Beacons / Stan / Bento (the link-in-bio category)** — *The fastest-growing micro-page category. We treat it as a first-class workflow.*
- **Existing competitive scan from V2-01** — *Every workflow we add has a category we're competing in; positioning vs the dominant alternative is part of the workflow's marketing page.*

---

## How To Run This Mission

The "framework for adding workflows" was documented at the end of W-04: register a new `page_type` in the schema, add a planner strategy, build a composer with a system prompt + exemplars, register starter templates, customize the Page Detail tabs if needed, add a marketing landing page. Each new workflow follows that recipe.

The discipline here: **don't add workflows we won't invest in.** Each new workflow costs:
- A composer system prompt that's actually good (not just functional).
- Annotated exemplars in the prompt's training fixtures.
- Curated templates seeded into the library (5-10 per workflow minimum).
- A marketing landing page with real demo content.
- Coverage in the analytics taxonomy.
- Tests.

If we add a workflow and don't invest in it, we get bad first impressions across that whole category. Better to ship 8 great workflows than 14 mediocre ones.

The eight workflows added in this mission, prioritized by demand and ease of execution:
1. **Link-in-bio mini-page** (the Linktree/Beacons category)
2. **Event RSVP page** (already lightly supported; promote to first-class)
3. **Restaurant menu / service menu** (also lightly supported; promote)
4. **Survey / poll** (Typeform-light territory)
5. **Quiz / interactive form** (BuzzFeed/Outgrow territory)
6. **Coming-soon / waitlist page** (preludes for any product launch)
7. **Photography / portfolio gallery** (already lightly supported; finish it)
8. **Resume / personal site** (the "about me" page)

The existing workflows (mobile, web, web page, contact form, proposal, pitch deck, landing page) are unchanged. After this mission, Forge supports 14 distinct workflows, all routable from the Studio empty state.

Commit on milestones: workflow registry expansion, composer per workflow, template seeds, marketing pages, Studio + Dashboard integration, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Workflow Registry Expansion

1. Update the `pages.page_type` CHECK constraint to include the new types:
    ```sql
    ALTER TABLE pages
      DROP CONSTRAINT IF EXISTS pages_page_type_check,
      ADD CONSTRAINT pages_page_type_check CHECK (page_type IN (
        'contact_form', 'booking_form', 'event_rsvp', 'menu',
        'landing', 'proposal', 'pitch_deck', 'gallery', 'promotion',
        'mobile_app', 'web_page', 'website',
        'link_in_bio', 'survey', 'quiz', 'coming_soon', 'resume'
      ));
    ```
2. Update the workflow registry in `apps/api/app/services/workflows/registry.py`:
    ```python
    WORKFLOW_REGISTRY: dict[str, WorkflowDefinition] = {
        "link_in_bio": WorkflowDefinition(
            slug="link_in_bio",
            display_name="Link in bio",
            description="A mini-page for your social profile bio link.",
            category="micro_pages",
            icon="link",
            composer_class=LinkInBioComposer,
            planner_class=LinkInBioPlanner,
            page_detail_template="link_in_bio_detail",
            export_formats=["html", "hosted"],
            credits_per_generation=3,
            comparison_alternative="Linktree, Beacons, Stan",
        ),
        # ... 7 more
    }
    ```
3. Each workflow definition is the single source of truth — referenced by Studio's empty state, the Page Detail layout, the marketing /workflows route, the credit calculator, and analytics tagging. New workflows added later only modify this registry.
4. Update the Studio empty-state workflow picker to show 14 tiles total. Visual-design challenge: 14 tiles doesn't fit cleanly in a single row. Solution: a 4×4 grid (16 slots, two left for "browse all templates" / "surprise me" cards). Tiles are organized by category:
    - **Pages & sites** row: web page · website · landing page · coming soon
    - **Forms & gathering** row: contact form · survey · quiz · event RSVP
    - **Sales & business** row: proposal · pitch deck · menu · gallery
    - **Personal & social** row: link in bio · resume · mobile app · browse all
5. The category labels appear as small dividers between rows. Visually grouped but still scannable.

### Phase 2 — Link-In-Bio Workflow

6. **Composer**: `LinkInBioComposer` with system prompt `composers/link_in_bio.v1.md`. Voice: punchy, friendly, made-for-mobile-scroll.
7. **Component library additions**:
    - `link_in_bio_avatar_block` — circular avatar + name + 1-line bio.
    - `link_in_bio_link_card` — full-width tappable link with optional emoji, label, optional preview thumbnail. Stack vertically.
    - `link_in_bio_social_row` — small inline row of social icons.
    - `link_in_bio_featured_block` — slightly bigger highlighted card for a primary item ("Latest video", "New product").
    - `link_in_bio_embed` — embedded Spotify track, YouTube video, or Substack post.
    - `link_in_bio_subscribe_form` — slim email-only collection form.
8. **Default structure** (the planner): avatar block → 4-8 link cards → optional featured block → social row → optional subscribe form.
9. **Special features**:
    - Built-in click tracking on every link (already supported by analytics events; just wire `link_in_bio_link_card` clicks to fire a `link_click` event).
    - **Link reordering** — the Page Detail's edit surface lets the user drag links to reorder without re-prompting.
    - **Link CRUD** — add a new link via a small "+" button without re-prompting; edit a link's URL/label inline.
    - **Theme variants** — Forge ships 5 theme variants (warm cream, dark mode, gradient, minimalist white, retro): user picks via the Tweaks panel.
10. **Analytics specific to this workflow**: click-through rate per link, top-clicked link, drop-off (people who view but don't click).
11. **Templates** (10 seeded): "Creator" / "Founder" / "Musician / podcaster" / "Restaurant" / "Photographer" / "Real estate agent" / "Newsletter writer" / "Bookable freelancer" / "Brand collab page" / "Event link hub".
12. **Marketing page** at `/workflows/link-in-bio` — hero "Your bio link, prettier than Linktree." Comparison table vs Linktree (price, customization, branding, analytics depth, custom domain).

### Phase 3 — Event RSVP Workflow (Promoted)

13. **Composer**: `EventRSVPComposer` — the existing workflow gets a proper system prompt and updated component library.
14. **Component library additions**:
    - `event_hero` — event title, date, location, optional cover image.
    - `event_details_card` — what / when / where / who / dress code / parking notes.
    - `event_rsvp_form` — variant of `form_stacked` with Yes/No/Maybe + plus-one + dietary restrictions + custom fields.
    - `event_count_indicator` — "23 going · 4 maybe" (live count from submissions). Optional, off by default for privacy.
    - `event_map_embed` — Google Maps or static map.
    - `event_add_to_calendar` — buttons for Google / Apple / Outlook calendar add (generates `.ics` on demand).
15. **Default structure**: hero → details card → RSVP form → optional count indicator → optional map → add-to-calendar buttons → footer.
16. **Special features**:
    - **Live RSVP count** — the count indicator updates in near-real-time via the same analytics infrastructure.
    - **Capacity limits** — host can set a maximum guest count. Past capacity, the form switches to "Waitlist" mode. Both states have distinct UI.
    - **Plus-ones** — host chooses to allow 0, 1, or N plus-ones per RSVP.
    - **Custom questions** — the host can prompt Forge to add specific questions ("ask for dietary restrictions", "ask shirt size for goodie bags").
17. **Analytics**: RSVP rate (yes vs no vs no-response), peak RSVP time, plus-one ratio.
18. **Templates** (8 seeded): "Wedding" / "Birthday party" / "Corporate event" / "Startup launch party" / "Conference / meetup" / "Workshop" / "Dinner party" / "Holiday party".
19. **Marketing page** at `/workflows/event-rsvp` — hero "Your event, RSVP'd. No spreadsheets." Comparison vs Partiful, Paperless Post, Eventbrite (price, branding flexibility, host control).

### Phase 4 — Menu Workflow (Promoted)

20. **Composer**: `MenuComposer`. Restaurants AND service providers ("services menu" for a salon, "treatment menu" for a spa).
21. **Component library additions**:
    - `menu_section_header` — large category label (Appetizers / Mains / Desserts / Drinks).
    - `menu_item_row` — name, description, price, optional dietary chips (vegan, gluten-free, spicy).
    - `menu_item_card_image` — same but with a thumbnail image.
    - `menu_item_callout` — emphasized item ("Chef's special").
    - `menu_legend_block` — explains dietary / allergen chips.
    - `menu_specials_banner` — top-of-page rotating callout for daily specials.
22. **Default structure**: hero with restaurant/business info → optional specials banner → menu sections (3-6) → legend → footer with hours and contact.
23. **Special features**:
    - **Multilingual** — toggle a second language. Forge translates the menu inline; user reviews; published menu has a language switcher.
    - **Dietary filters** — the published menu has a "show vegan only" / "show gluten-free only" filter chip set.
    - **Print-friendly** — a "Print this menu" button at the footer; print CSS produces a clean takeout-friendly version.
    - **QR-code-ready** — every menu has a download-QR-code button. The QR encodes the public URL with a UTM tagging for "menu_qr" so analytics can track in-restaurant scans vs out-of-restaurant.
24. **Templates** (8 seeded): "Coffee shop" / "Casual restaurant" / "Fine dining" / "Cocktail bar" / "Bakery" / "Salon services" / "Spa treatments" / "Tutoring services menu".
25. **Marketing page** at `/workflows/menu` — hero "Your menu, online in minutes." Comparison vs Toast, Square, generic Squarespace menus.

### Phase 5 — Survey Workflow

26. **Composer**: `SurveyComposer`. Closer to Typeform than to a contact form — multi-step, often with logic branching.
27. **Component library additions** (extend on form components):
    - `survey_step_container` — wraps a single step in a multi-step survey.
    - `survey_progress_bar` — top-of-form indicator showing X of Y steps.
    - `survey_step_navigation` — Back / Next buttons.
    - `survey_question_intro` — large question text + optional helper text + optional image.
    - `field_likert_scale` — 1-5 or 1-10 satisfaction scale.
    - `field_emoji_rating` — 5 emoji rating (terrible to amazing).
    - `field_ranking` — drag-to-reorder list.
    - `field_matrix` — grid of questions with the same answer options (e.g., 5 features × satisfaction levels).
    - `field_open_ended_long` — large textarea for free-form feedback.
28. **Default structure**: opening intro screen → 5-15 question steps → optional thank-you screen with shareable insights.
29. **Special features**:
    - **Branching logic** — "If they answer Yes, skip to step 7." A small visual logic editor on the Page Detail lets the user wire branches without code.
    - **Required vs optional** per question.
    - **Anonymous mode** — survey doesn't collect identifying info; submissions persist with no `submitter_email`.
    - **Real-time aggregate view** — Page Detail shows live charts of responses (bar charts for choice questions, word clouds for open-ended). Optional "share aggregate results" public link.
30. **Analytics**: completion rate, average time per question, drop-off per question (which question makes people quit), most-skipped optional fields.
31. **Templates** (10 seeded): "NPS / customer satisfaction" / "Product feedback" / "Event feedback" / "Employee engagement" / "Course feedback" / "User research interview screener" / "Wedding RSVP+preferences" / "Quick poll" / "Onboarding intake form" / "Annual review questionnaire".
32. **Marketing page** at `/workflows/survey` — hero "Surveys that people actually finish." Comparison vs Typeform, SurveyMonkey, Google Forms.

### Phase 6 — Quiz Workflow

33. **Composer**: `QuizComposer`. Outcomes-based quizzes ("Which color matches your brand?") and knowledge quizzes ("Test your X knowledge").
34. **Component library additions**:
    - `quiz_intro_screen` — title, description, "Start quiz" CTA.
    - `quiz_question_screen` — question + 2-6 answer options.
    - `quiz_result_screen` — "Your result: {outcome}" + description + optional CTA.
    - `quiz_score_screen` — "{N}/{total} correct" + breakdown.
    - `field_quiz_image_choice` — visual choice grid where each option is an image.
35. **Two quiz modes**:
    - **Outcome mode** — answers are tagged with outcomes; final result is the most-tagged outcome. Used for personality / "which X are you?" / recommendations.
    - **Score mode** — each answer has a correct/incorrect mark; final score is X/Y.
36. **Default structure**: intro → 5-10 question screens → result screen.
37. **Special features**:
    - **Lead capture** before showing result — optional "Enter email to see your result" gate.
    - **Shareable results** — every result screen has social-share buttons (Twitter / LinkedIn / WhatsApp) with a custom share image.
    - **Outcome-based redirect** — different outcomes can route to different follow-up URLs (e.g., "You're a Pro user → enroll here", "You're a Beginner → start here").
38. **Analytics**: completion rate, outcome distribution, most-influential question (which question most affects the outcome distribution), lead capture rate.
39. **Templates** (8 seeded): "What's your design style?" / "Which product is right for you?" / "Personality quiz" / "Knowledge quiz template" / "Career path finder" / "Pre-purchase recommendation" / "Brand archetype" / "Onboarding placement quiz".
40. **Marketing page** at `/workflows/quiz` — hero "Quizzes that convert." Comparison vs Outgrow, Interact, Typeform Quizzes.

### Phase 7 — Coming Soon / Waitlist Workflow

41. **Composer**: `ComingSoonComposer`. Single-screen, focused on email capture before launch.
42. **Component library additions**:
    - `coming_soon_hero` — large product name + tagline + countdown timer.
    - `coming_soon_email_capture` — single email input + "Notify me" button.
    - `coming_soon_referral_block` — "Refer a friend, move up the list" mechanic with shareable referral URL and current position display.
    - `coming_soon_features_preview` — 3 bullets describing what's coming.
    - `coming_soon_team_block` — "Built by {team}" with photos and bios.
43. **Default structure**: hero with countdown → email capture → optional referral block → optional features preview → optional team block → footer.
44. **Special features**:
    - **Countdown timer** — counts down to a configured launch date. Hits zero → switches to "We're live!" state with a redirect to the actual launch page.
    - **Referral mechanics** — every signup gets a unique referral URL. New signups via that URL credit the referrer. Page shows "{N} on the list, you're #{position}" ranked by referrals.
    - **Email export to mailing list** — one-click export of waitlist emails to Mailchimp / ConvertKit / Resend audience.
    - **Launch-day automation** — when the countdown hits zero, every waitlist email gets a launch-day notification email automatically.
45. **Analytics**: email signup rate, referral conversion rate, top referrers, geographic distribution.
46. **Templates** (6 seeded): "SaaS product launch" / "Restaurant opening" / "Book launch" / "Course / cohort waitlist" / "Beta program signup" / "Newsletter launch".
47. **Marketing page** at `/workflows/coming-soon` — hero "Build a waitlist before you build the product." Comparison vs Carrd templates, Mailchimp landing pages, Webflow.

### Phase 8 — Gallery / Portfolio Workflow (Promoted)

48. **Composer**: `GalleryComposer`. The existing `gallery` page_type gets a real composer.
49. **Component library additions**:
    - `gallery_hero` — name + 1-paragraph bio + contact link.
    - `gallery_grid` — responsive grid of images. Variants: square / masonry / cinematic-wide.
    - `gallery_lightbox` — fullscreen image viewer with prev/next.
    - `gallery_collection_header` — title for a sub-gallery.
    - `gallery_about_block` — long-form bio + skills + experience.
    - `gallery_inquiry_form` — small form for "Hire me" or "Book a session" inquiries.
50. **Default structure**: hero → gallery grid (with optional collection grouping) → about block → inquiry form → footer.
51. **Special features**:
    - **Bulk image upload** — drag-and-drop 50+ images at once. Each gets auto-labeled (Forge captions them via vision model) which the user can edit.
    - **Collections** — group images into named collections (Weddings / Portraits / Editorial). Each collection has its own page within the gallery.
    - **Watermarks** — optional auto-applied watermark on displayed images (for photographers protecting their work).
    - **Print sales** — links to a print-on-demand integration (deferred but architected for; integration with Printful or similar).
52. **Analytics**: most-viewed image, average time on gallery, inquiry form conversion.
53. **Templates** (8 seeded): "Photographer (wedding)" / "Photographer (portrait)" / "Designer portfolio" / "Illustrator portfolio" / "Architect / interior designer" / "Artist (paintings)" / "Crafts / handmade" / "Tattoo artist".
54. **Marketing page** at `/workflows/gallery` — hero "Your portfolio, beautifully." Comparison vs Squarespace, Format, Adobe Portfolio.

### Phase 9 — Resume / Personal Site Workflow

55. **Composer**: `ResumeComposer`. The "about me" page for individual professionals — a step up from a CV PDF.
56. **Component library additions**:
    - `resume_hero` — name + role + tagline + headshot + contact icons.
    - `resume_summary_block` — 2-3 paragraph bio.
    - `resume_experience_card` — company, role, dates, 3-bullet description.
    - `resume_skills_grid` — categorized skill chips.
    - `resume_education_card`, `resume_certifications_block`, `resume_publications_list`.
    - `resume_projects_grid` — 3-6 highlighted projects with image, name, link.
    - `resume_testimonial_block` — embedded LinkedIn-style recommendation.
    - `resume_download_pdf_button` — generates a clean ATS-friendly PDF version on demand.
57. **Default structure**: hero → summary → experience → projects → skills → education → footer with contact.
58. **Special features**:
    - **PDF export** — generates a print-ready PDF that's actually well-typeset (uses the existing Playwright PDF pipeline from W-02 with a resume-specific template).
    - **LinkedIn import** — paste a LinkedIn URL or upload a LinkedIn data export; Forge populates the resume automatically.
    - **Custom domain support** — most users want their own `johndoe.com` for this workflow specifically. Custom domain setup is highlighted in onboarding.
    - **Track who views your resume** — analytics specifically tuned for "who's been on my resume": top viewer companies (inferred from IP-based company detection like Clearbit), recent viewers, hot moments.
59. **Templates** (8 seeded): "Software engineer" / "Designer" / "Product manager" / "Marketing professional" / "Founder / executive" / "Academic / researcher" / "Creative / writer" / "Service professional / consultant".
60. **Marketing page** at `/workflows/resume` — hero "Your resume site, smarter than a PDF." Comparison vs personal Notion pages, Carrd, Squarespace.

### Phase 10 — Studio Empty-State Refresh

61. The 4×4 grid from Phase 1 is the new Studio empty state. Each tile shows: icon, name, 1-line teaser, hover-reveal example prompt. Clicking primes the chat input with the starter prompt for that workflow.
62. Real example chips below the grid cycle through one example per workflow per session, so the user sees variety without a wall of suggestions.
63. The empty state is responsive — on tablet, the grid becomes 3×6 (3 columns, 6 rows). On mobile, 2×8. Touch targets stay ≥44px.

### Phase 11 — Templates Library Expansion

64. Total templates after this mission: ~60 across all 14 workflows. Curated in `apps/api/fixtures/templates/` and seeded via the existing `seed_templates.py`.
65. Templates browser at `(app)/templates`:
    - Top: workflow-category filter (the same 4-row grouping from Studio).
    - Each template card: thumbnail, name, workflow chip, "Use template" button.
    - Click a template → Studio opens with the template's intent pre-filled and the user just customizes the words and brand.
66. Marketing `/templates` page mirrors the in-app browser but adds a search bar, category tabs, and individual template detail pages with a fully-rendered preview ("see what you're starting from before signing up").
67. Each template's seed YAML follows the same structure as existing seeds — see `apps/api/fixtures/templates/proposal_residential_remodel.yml` as a reference. New seeds reuse the format.

### Phase 12 — Page Detail Customization Per Workflow

68. Each new workflow gets the appropriate Page Detail tabs:
    - **Link in bio**: Overview · Links (CRUD/reorder) · Submissions (if subscribe form is enabled) · Analytics · Settings.
    - **Event RSVP**: Overview · RSVPs (with Yes/No/Maybe filters) · Settings.
    - **Menu**: Overview · Menu items (CRUD/reorder) · QR Codes · Settings.
    - **Survey**: Overview · Responses · Logic (branching editor) · Aggregate Results (live charts) · Settings.
    - **Quiz**: Overview · Responses · Outcomes (distribution) · Settings.
    - **Coming soon**: Overview · Waitlist (email list) · Referrals (leaderboard) · Launch (countdown config) · Settings.
    - **Gallery**: Overview · Collections · Images (bulk manage) · Inquiries · Settings.
    - **Resume**: Overview · Sections (drag-reorder) · Viewers (privacy-respecting analytics) · Settings.
69. The customization is done via the `getWorkflowConfig(pageType)` helper from W-04, extended with the new workflows.

### Phase 13 — Tests & Documentation

70. Composer evaluation fixtures for each new workflow: 30+ fixtures per composer with property assertions ("survey has 5-15 questions", "resume includes experience and skills sections", etc.).
71. Template seed validation tests: every template's intent JSON parses, the resulting page renders without validation errors, every seed loads idempotently.
72. End-to-end Playwright tests for each new workflow's golden path: open Studio empty state → pick the workflow → submit a starter prompt → publish → visit public URL → submit (where applicable) → verify backend recorded the activity.
73. Update `docs/architecture/WORKFLOW_FRAMEWORK.md` to reflect the 14-workflow surface and the framework's track record.
74. Update marketing pages to link the 8 new workflow landings into the navigation.
75. Mission report.

---

## Acceptance Criteria

- 14 workflows registered, each with a fully working composer, exemplar fixtures, and seeded templates.
- Studio empty-state shows the 4×4 grid responsive layout.
- Each new workflow has its own Page Detail customization with relevant tabs.
- Each new workflow has its own marketing landing page with positioning and a competitor comparison.
- ~60 curated templates seeded across the workflow suite.
- Templates library browser (in-app and marketing) supports filtering, searching, and previewing.
- Per-workflow analytics events captured for the new event types (link_click, rsvp_submit, menu_item_view, etc.).
- All composer evaluation fixtures pass.
- All Playwright golden-path tests pass for new workflows.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
