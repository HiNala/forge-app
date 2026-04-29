# V2 MISSION P-07 — Easy Handoff: Export Pipelines For Every Workflow

**Goal:** Make Forge's "take it with you" promise real and frictionless. After this mission, every Forge mini-app — every workflow, every output — has a clean, well-documented export path the user can hand off to a developer, a designer, or another platform with zero hassle. Forms export as embeddable HTML widgets and standalone pages; mobile and web designs export as Figma frames and as runnable Next.js / Expo projects; pitch decks as PPTX / PDF / Google Slides; proposals as signed PDFs; surveys as Typeform-compatible JSON; menus as printable PDFs; coming-soon pages as static HTML zips. After this mission, the user can pick "keep it on Forge" or "take it with me" with confidence that both options work — eliminating the lock-in concern that kills B2B SaaS adoption.

**Branch:** `mission-v2-p07-handoff-exports`
**Prerequisites:** All prior missions through V2-06 complete. Workflow registry has 14 workflows. Existing exports (proposal PDF, deck PPTX from W-02/03; HTML from V2-03) operational.
**Estimated scope:** Medium-large. Existing export work is reused; the work is filling in the gaps so every workflow has every appropriate export path, plus a unified Export UI that's the same regardless of workflow.

---

## Experts Consulted On This Mission

- **Don Norman** — *Lock-in is a design failure. The exit door is part of the entrance experience.*
- **Jesse James Garrett** — *The export surface IS a feature, not a footnote. Treat it accordingly.*
- **Stripe's documentation philosophy** — *Every export documented, every example runnable, every format honored.*
- **Reasonable web standards** — *Semantic HTML for forms, accessible markup for content, valid PDF for documents, standard Figma format for designs.*

---

## How To Run This Mission

The "easy handoff" promise is critical to Forge's positioning per V2-01 — it differentiates us from purely-locked-in SaaS competitors and reassures the cautious buyer who's been burned by Squarespace exports or Wix lock-in. Get this wrong and the strategic reframe loses its teeth.

The discipline: **every export format is a contract.** Once we ship a format, users plan around it. Breaking it later costs us trust. So we pick the formats carefully, version them carefully, and test their durability against real handoff scenarios (not just "we generated a file, the file exists").

The architecture is unified: one `ExportService` with workflow-aware adapters, a uniform `Export` UI surface in Page Detail, unified export tracking in `usage_counters` (exports are free; we track them for analytics).

Commit on milestones: export adapter framework, per-workflow exports completed, Page Detail Export tab unified, validation tests, documentation, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Export Service Framework

1. Build `apps/api/app/services/export/service.py` — the unified entrypoint:
    ```python
    class ExportService:
        async def get_available_formats(page: Page, user: User) → list[ExportFormat]: ...
        async def queue_export(page_id: UUID, format: str, options: dict) → ExportJob: ...
        async def get_export_status(export_id: UUID) → ExportStatus: ...
        async def get_download_url(export_id: UUID) → str: ...
    ```
2. Each workflow registers its supported export formats in the workflow registry (V2-06):
    ```python
    "proposal": WorkflowDefinition(
        # ...
        export_formats=["pdf_signed", "pdf_unsigned", "html_static", "docx", "google_doc"],
    ),
    "mobile_app": WorkflowDefinition(
        export_formats=["figma", "expo_project", "html_prototype", "png_screens", "svg_screens"],
    ),
    # ...
    ```
3. Each format is implemented as a separate adapter class in `apps/api/app/services/export/adapters/`. Adapters share a common base class:
    ```python
    class ExportAdapter(Protocol):
        format_name: str
        plan_minimum: Literal['free','pro','max_5x','max_20x'] = 'free'
        async def export(page: Page, options: dict) → ExportArtifact: ...
    ```
4. Exports run as worker jobs (existing arq infrastructure). Long-running exports (e.g., a 25-page Figma file) stream progress events the frontend listens to: `export.progress`, `export.complete`, `export.failed`.

### Phase 2 — Export UI (Unified)

5. Every Page Detail's `Export` tab uses the same component, parameterized by the workflow's available formats.
    - **Header**: "Export {page.title}" + a one-line description ("Take your work with you, or just keep it on Forge.").
    - **Format cards** — one per available format. Each card shows: format icon, format name, description ("React Native code you can run with `npx expo start`"), a "What's in it?" disclosure with an exact file/folder listing, plan-required badge (gray if available, gold "Pro+" if locked).
    - **Configure & export** — clicking a format opens a small inline config form (e.g., for Figma: "Open in your team / Open in personal account?"; for HTML: "Include analytics tracker?"; for PDF: "Include cover page?"). Settings persist per-page for convenience.
    - **Recent exports** strip — last 5 exports with timestamp, format, size, expiry of download link, "Re-download" button.
6. Plan gating: locked formats show with a faint overlay + "Available on Pro" CTA that routes to upgrade. Never hide locked options; always show what's possible to encourage upgrades.
7. Export history retained 30 days; older exports archived to S3 cold storage with on-demand re-generation possible (logs the request and re-runs the adapter).

### Phase 3 — Form-Family Exports (Contact Form, Survey, Quiz, RSVP)

8. **Embeddable HTML widget** — for users who want the form on their existing website:
    - Single `<iframe>` snippet with sane defaults: responsive height, configurable theme overrides via URL params.
    - OR a "more advanced" snippet: a `<div data-forge-form="{slug}"></div>` placeholder + a `<script src="https://embed.forge.app/v1.js">`. The script renders the form inline (not in an iframe) so it inherits parent styles. Better for designers wanting tight integration.
    - Both options track submissions through Forge's submission system — the user's existing analytics + automation chain still fires.
9. **Standalone HTML page** — a fully self-contained `.html` file (with inlined CSS) the user can host anywhere. Form action points to Forge's submission endpoint by default, OR can be re-configured to point to the user's own backend (with a clearly-marked `<form action="REPLACE_WITH_YOUR_BACKEND">` placeholder).
10. **Submissions data export** — CSV / JSON / Excel of all submissions for that page. Already exists from BI-03; this mission ensures it's accessible from the unified Export tab.
11. **Webhook integration export** — generates a snippet of code (Node.js / Python / curl) showing how to subscribe to form-submission webhooks via the API. Useful for users who want to migrate to their own backend.
12. Per-workflow specifics:
    - **Survey**: also exports as Typeform-importable JSON (using their public schema). Lets users migrate FROM Forge TO Typeform if they want — the door swings both ways.
    - **Quiz**: exports as both a survey-equivalent JSON and as a self-contained interactive HTML file with the quiz logic preserved.
    - **Event RSVP**: exports as a CSV plus an `.ics` file containing the event itself plus a folder of attendee email addresses for sending day-of reminders.

### Phase 4 — Proposal Exports

13. **Signed PDF** — already exists (W-02). Ensure it's surfaced in the unified Export tab.
14. **Unsigned PDF** — current draft state, watermarked "DRAFT — NOT YET SIGNED". For users who need to send a copy outside Forge before signature.
15. **Static HTML page** — a single `.html` file the user can host on their own server.
16. **Google Doc export** — via the Google integration (BI-03). Creates a new Google Doc in the user's Drive with the proposal content. Tables and formatting preserved.
17. **DOCX export** — Microsoft Word format using `python-docx`. Tables, headings, line items, signature block all included.
18. **Email-friendly version** — a clean inlined-CSS HTML version optimized for email forwarding. Renders correctly in Gmail / Outlook / Apple Mail (tested against Litmus or Email on Acid sample inboxes).

### Phase 5 — Pitch Deck Exports

19. **PPTX** — already exists (W-03). Ensure unified Export tab access. Verify font embedding works across Microsoft / Google / LibreOffice.
20. **PDF** — already exists. One slide per page, bookmarks per slide for navigation in PDF readers.
21. **Google Slides** — already exists (W-03). Verify integration is solid post-merge.
22. **Keynote** — Apple Keynote format via the underlying iWork XML format. Uses an open-source library (`pyKeynote` or generated from PPTX via Apple's online converter API). Lower priority; ship if time permits.
23. **Image export per slide** — each slide rendered as a high-res PNG (1920×1080 desktop / 1080×1920 vertical for Stories). For users wanting to post slides individually on social.
24. **Speaker notes export** — a clean text/Markdown file with speaker notes for each slide. Useful for presenter rehearsal away from the slides.

### Phase 6 — Mobile App Design Exports

25. **Figma file** — already exists (V2-02). Verify auto-layout, tappable prototype connections (flow edges), and Figma component library linkage all transfer correctly.
26. **Expo / React Native project** — already exists (V2-02). Verify the project runs with `npx expo start` and that components rendered match the canvas designs visually. Include an `assets/` folder with all images, an `app.json` with app metadata, a `package.json` with locked dependency versions.
27. **HTML prototype** — already exists. Verify navigation between screens works in a real browser.
28. **PNG / SVG screens** — already exists. Verify retina (2x and 3x) variants are exported.
29. **Lottie animations export** (new) — for screens with animated transitions specified, export the transition definitions as Lottie JSON files. Lower priority; ship if time permits.

### Phase 7 — Web Page / Website Exports

30. **Static HTML zip** — already exists (V2-03). Verify all pages link correctly with relative paths, all assets are included, the result extracts and runs correctly when opened locally.
31. **Next.js project** — already exists (V2-03). Verify the project builds with `pnpm install && pnpm build && pnpm start`, all pages route correctly, brand tokens are codified in Tailwind config, forms are wired to either Forge's submission endpoint OR a stubbed local handler.
32. **Framer / Webflow JSON** — already exists. Verify imports cleanly via the official import paths.
33. **WordPress block export** (new) — converts each page to a WordPress block-editor JSON format that imports as Gutenberg blocks. For users migrating to WP. Lower priority; ship if time permits.
34. **Cloudflare / Vercel / Netlify deploy buttons** — generates a one-click deploy link with the project pre-configured. The project is bundled as a public GitHub gist or template repo, the deploy link points to the platform's deploy interface with the source URL filled in.

### Phase 8 — Other Workflow Exports

35. **Link in bio**:
    - Static HTML zip (single-page, fully self-contained).
    - Hosted-on-Forge (default — keeps the analytics, just publish at a custom domain).
    - QR code PNG of the public URL.
36. **Menu**:
    - Static HTML zip.
    - Print-ready PDF (8.5×11 with the menu beautifully laid out).
    - QR code PNG (the canonical use case — print on a sticker for tables).
    - Spreadsheet export (CSV/XLSX) of menu items for syncing with POS systems.
37. **Coming soon**:
    - Static HTML zip.
    - Waitlist email list as CSV.
    - Mailchimp / ConvertKit / Resend audience export (via API integrations).
38. **Gallery**:
    - Static HTML zip.
    - All images as a zip (original resolution, watermarked or unwatermarked per setting).
    - Lightroom / Capture One catalog import format (lower priority).
39. **Resume**:
    - PDF (the canonical "send this to a recruiter" format) — uses the Playwright PDF pipeline.
    - DOCX — for ATS systems that prefer Word.
    - JSON Resume schema (`jsonresume.org`) — for hosts and tools that consume it.
    - Static HTML zip.
    - LinkedIn-importable format — populates a LinkedIn profile draft via their API (deferred if API access is gated).

### Phase 9 — Domain & Hosting Handoff

40. The "keep it on Forge" path is the default for users who don't want to manage hosting. But Forge's hosting can be migrated to user-owned domains via the Custom Domains feature from BI-04. This mission ensures every workflow plays nicely with custom domains:
    - The export UI links prominently to Settings → Custom Domains for users who want their own URL.
    - Custom domains support all 14 workflows (some currently are limited; verify each).
    - SSL via Caddy on-demand TLS as established in GL-04.
41. **DNS & domain transfer kit** — on demand, generate a "If you ever want to leave Forge" PDF for the user containing:
    - Their domain's current DNS pointers.
    - Recommended replacement DNS pointers for popular hosts (Vercel, Netlify, Cloudflare Pages, AWS S3+CloudFront).
    - A snapshot of all their submission data, analytics aggregates, and brand kit settings (everything they'd need to recreate the experience elsewhere).
    Only a few users will ever request this; the offer is what builds trust.

### Phase 10 — Export Quality Validation

42. Build `tests/exports/quality_validators/` — programmatic validators for each format:
    - **PDF validators**: pages parse via `pypdf`, fonts are embedded (not just referenced), text is selectable (not rasterized), bookmarks exist where promised.
    - **PPTX validators**: file opens with `python-pptx`, slide count matches, charts are native (editable), images embedded (not linked).
    - **DOCX validators**: file opens with `python-docx`, headings preserved, tables render.
    - **HTML zip validators**: extracts cleanly, every linked asset exists in the zip, every internal link resolves, the entry HTML validates as HTML5.
    - **Next.js project validators**: `pnpm install` succeeds, `pnpm build` succeeds, no TypeScript errors, no runtime crashes on a smoke render.
    - **Expo project validators**: similar — `expo doctor` passes, all dependencies resolve.
    - **Figma JSON validators**: validates against the Figma file format spec; auto-layout flags present where promised.
43. Quality validators run in CI on every export adapter change. A break means the export contract is broken; merge is blocked.

### Phase 11 — Export Analytics & Tracking

44. Every export fires an analytics event `export_initiated` with `{format, workflow, options}` and `export_completed` (or `export_failed`) — feeds GL-01's analytics so we can see which formats are most-used.
45. Failed exports are visible to admin via the Admin → System dashboard. Repeated failures of the same format trigger an alert.
46. Export size and duration metrics tracked per format. Useful for identifying performance regressions and capacity planning.

### Phase 12 — Documentation

47. `docs/handoff/EXPORT_FORMATS.md` — user-facing catalog of every format per workflow, with examples and clear "use this when…" guidance.
48. `docs/handoff/MIGRATION_GUIDES.md` — step-by-step guides for "I want to leave Forge for {Vercel / Webflow / Squarespace / Notion}." Honest, not gatekeeping. The trust this builds compounds over years.
49. `docs/architecture/EXPORT_PIPELINE.md` — engineering reference: adapter pattern, validation, performance, capacity considerations.
50. The `/handoff` marketing page from V2-01 is filled in with concrete details: a video walkthrough of exporting a Forge mobile design into Figma, a story of one customer who migrated successfully (or a "what's possible" walkthrough until we have one).
51. Mission report.

---

## Acceptance Criteria

- ExportService framework supports adapter-per-format pattern with worker-job execution and progress streaming.
- Every workflow has the appropriate export formats registered and implemented.
- Page Detail Export tab is unified across workflows, parameterized by available formats.
- Plan gating works: locked formats are visible with upgrade CTAs.
- Form-family exports include embeddable widget, standalone HTML, submissions CSV, webhook code samples.
- Proposal exports include signed PDF, unsigned PDF, HTML, Google Doc, DOCX, email-friendly HTML.
- Pitch deck exports include PPTX, PDF, Google Slides, per-slide PNGs, speaker notes.
- Mobile design exports include Figma, Expo project, HTML prototype, retina PNGs / SVGs.
- Web page / website exports include HTML zip, Next.js project, Framer JSON, Webflow JSON, deploy buttons.
- Niche workflow exports (link in bio, menu, coming soon, gallery, resume, survey, quiz, RSVP) all functional.
- Custom domain support extends to every workflow.
- Domain & hosting handoff kit generates on demand.
- Quality validators block CI on broken export contracts.
- Export analytics surface format adoption and failure rates to admin.
- All documentation written.
- Mission report complete.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
