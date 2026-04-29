# V2 MISSION P-03 — Web Page & Multi-Page Website Canvas

**Goal:** Take everything from the mobile canvas in V2-02 and apply the same design philosophy — infinite canvas, prompted-into-existence pages, click-and-marquee scoped refinement — to the web. The user picks "Web page" or "Website" and lands in a canvas where each page appears as a desktop browser frame (and a tablet + mobile responsive preview alongside it). They prompt one page or a multi-page site, draw selection rectangles to refine specific regions, configure routing between pages, and export to clean code (Next.js / static HTML / Framer-style hosted) or to Figma. After this mission, Forge handles the web-design canvas use case at the same quality as the mobile workflow, while staying compatible with the existing single-page workflows (landing page, contact form, proposal) so existing users see no disruption.

**Branch:** `mission-v2-p03-web-canvas`
**Prerequisites:** V2-02 complete. The xyflow canvas substrate, the marquee selection layer, the region-scoped editing pipeline, and the export-to-Figma plumbing all exist and just need adapting.
**Estimated scope:** Medium-large. Heavy reuse of V2-02's infrastructure; the new work is the web component library, multi-page-website orchestration, responsive preview rendering, and routing graph.

---

## Experts Consulted On This Mission

- **Tim Berners-Lee** — *The web is documents linked together. Multi-page generation should respect that fundamental shape.*
- **Ethan Marcotte (Responsive Web Design)** — *Three breakpoints minimum. The canvas shows all three so the designer never forgets.*
- **Brad Frost (Atomic Design)** — *Components compose into pages, pages compose into sites. The component library is the unit of consistency.*
- **Jakob Nielsen** — *Web users scan in F-patterns. Generated pages must respect this even at the placeholder stage.*

---

## How To Run This Mission

The architectural reuse is significant: V2-02 built the xyflow canvas, the device-frame node, marquee selection, region-scoped editing, and the four-format export pipeline. This mission specializes the same primitives for the web context — different node type (browser frame instead of phone), different component library (web instead of mobile), different orchestration prompts, different export targets.

The genuinely new work:
- **Multi-page site orchestration** — generating 5-10 pages of a website with consistent navigation, shared header/footer, and routing between them.
- **Responsive preview rendering** — showing each page at desktop / tablet / mobile widths simultaneously so the user sees the responsive behavior as they design.
- **Site-wide style sync** — changing the brand color updates all pages at once; changing a header updates the shared header on every page.
- **Static-site export** — bundle a generated multi-page website as a clean Next.js project or static HTML files, ready to deploy anywhere.

A key design decision: the existing single-page workflows (W-04's landing page, contact form, proposal, RSVP, menu, gallery, promotion) **continue to work the same way they always have** — chat panel + iframe preview, no canvas. Users who want a single page get the simple workflow; users who want a multi-page site or visual canvas get this mission's experience. The strategic reframe positions both as "mini-apps", with this mission's canvas being the upmarket option for users who think visually.

Commit on milestones: web canvas substrate (forked from V2-02), browser frame node, multi-page orchestration, responsive previews, site-wide style sync, web component library, export pipelines, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Web Canvas Substrate

1. Create `apps/web/src/components/canvas/WebCanvas.tsx` — the web equivalent of MobileCanvas. Same xyflow base, same pan/zoom/mini-map. Different default view (one large desktop-frame node centered).
2. Same toolbar primitives reused: zoom buttons, fit-to-view, theme toggle, marquee toggle. **New** to the web canvas:
    - **Breakpoint switcher** — toggles desktop / tablet / mobile preview rendering for ALL pages. Default: show all three side-by-side per page.
    - **Add page** — adds a new page node with prompt entry inline.
    - **Site nav editor** button — opens a modal that edits the shared site navigation (Phase 6).
3. The canvas defaults — when user picks "Web page" workflow, single browser-frame appears centered. When user picks "Website" workflow, multi-page mode is implied and a "Describe your website" prompt opens.

### Phase 2 — Browser Frame Node

4. A `BrowserFrameNode` is an xyflow custom node showing each page as three stacked browser frames at three breakpoints:
    - **Desktop** at 1440px wide (the macOS Safari standard) — the largest, top-most.
    - **Tablet** at 834px wide (iPad-portrait standard) — middle.
    - **Mobile** at 390px wide (iPhone 15 standard) — bottom.
    Each has a faux browser chrome (URL bar showing the page's path, traffic-light buttons on the left in macOS style, simple close indicator in cross-platform style).
5. The three breakpoints render the SAME page at different widths. The component tree includes responsive directives (e.g., `breakpoints: { desktop: 'three_column', tablet: 'two_column', mobile: 'stacked' }`) so the model can specify how the layout changes.
6. The `is_active_breakpoint` from the toolbar's breakpoint switcher emphasizes the active size visually (slightly brighter outline) and dims the others. This way the user can focus when needed but the comparison is always visible.
7. Each page node has:
    - A **page title** label above the frame ("Home" / "About" / "Pricing" / "Contact").
    - A **path** label ("/", "/about", "/pricing"). Editable inline.
    - A **page menu** at the top-right: rename, change path, duplicate, delete, set as homepage, export this page.
    - A **shared regions** indicator showing which sections (header / footer / nav) are inherited from the site-wide layout vs unique to this page.

### Phase 3 — Multi-Page Website Orchestration

8. The **website generator** is a new orchestration graph extending O-02's pattern:
    - **Stage 1 (site outline)** — given the user's prompt ("a website for my coffee shop with a menu, an about page, and a contact form"), the model produces a `SiteOutline`:
        ```python
        class SiteOutline(BaseModel):
            site_name: str
            site_description: str
            voice: VoiceProfile
            color_scheme: ColorScheme  # primary, accent, neutral
            font_pairing: FontPair
            site_navigation: list[NavItem]  # the shared nav across pages
            pages: list[PageSpec]  # ordered: [{slug, title, role, content_brief}]
            footer: FooterSpec
        ```
    - **Stage 2 (per-page generation)** — parallel generation of each page with the shared site context (nav + footer + brand) injected. Pages run 4-wide concurrent.
    - **Stage 3 (cross-page consistency review)** — a single review pass checks all pages for tone consistency, terminology consistency, and CTA coherence. Flags drift; refines if needed.
9. The site outline is editable BEFORE generation completes — the user can see the outline ("Pages to build: Home, Menu, About, Contact") in the chat panel and rearrange or remove pages before locking in. This is the "give them control over the high-stakes decision" principle.
10. After generation, the canvas auto-frames to fit all pages in a grid layout (3 pages wide, wrapping). The user can rearrange manually.
11. Streaming: as each page completes, it appears with the same fade-in pattern as the mobile canvas. Chat panel emits `page.complete` events.

### Phase 4 — Web Component Library

12. Build `apps/api/app/services/orchestration/components/web/`. Categories overlap heavily with the existing component library (since web is what the prior workflows already built) — this mission EXTENDS the existing `web/` components rather than duplicating. The extensions:
    - **Site-shell components**: `web_header_bar`, `web_header_centered_logo`, `web_footer_columns`, `web_footer_minimal`, `web_nav_horizontal`, `web_nav_dropdown`, `web_nav_mobile_drawer`.
    - **Page-section components** (web-specific layouts beyond what the single-page workflows had): `web_section_two_col`, `web_section_three_col`, `web_section_four_card_grid`, `web_section_split_image_text`, `web_section_full_bleed_image`, `web_section_video_embed`, `web_section_embedded_form`, `web_section_pricing_table`, `web_section_team_grid`, `web_section_logo_wall`, `web_section_testimonial_carousel`, `web_section_faq_accordion`, `web_section_blog_index`, `web_section_blog_article`.
    - **Specialty pages**: `web_page_about`, `web_page_contact`, `web_page_pricing`, `web_page_blog_index`, `web_page_blog_post`, `web_page_404`.
13. Each component has responsive directives — what it looks like at desktop / tablet / mobile. The breakpoint render pipeline applies the right variant per frame.
14. Component templates use Tailwind classes already; no new styling system.

### Phase 5 — Web Composer

15. Add `WebsiteComposer` and `WebPageComposer` to the orchestration layer (similar to the mobile case).
16. System prompts for both, in the established expert-voice format from O-03:
    - `composers/web_page.v1.md` — single-page composer. Builds on the existing landing-page composer with refinements for arbitrary single-page intent.
    - `composers/website.v1.md` — multi-page site composer. Operates at the SITE level (Stage 1 outline) and delegates to `web_page` composer per page (Stage 2). The two-stage pattern from O-03's deck composer applies here.
17. The website composer's prompt emphasizes:
    - "Every page exists for one reason. State that reason in the page's content_brief."
    - "Site navigation is consistent across pages. Don't put the contact link in the nav AND a giant 'Contact us' card on every page — that's redundant."
    - "Every page should be reachable from at least one other page. The user can see the orphans in the flow editor."
    - "If the user asks for an e-commerce site or a SaaS product site, suggest pages they didn't ask for but obviously need (Pricing, FAQ, Privacy, Terms). Add them with content drafts and flag them as 'auto-added'."
18. Region-scoped editing reuses the V2-02 pipeline 1:1 — same validator, same drift detection.

### Phase 6 — Site-Wide Editing

19. **Site-wide style sync** — changing brand color or font in the Tweaks panel updates all pages simultaneously.
    - Implemented via the brand-token mechanism: tokens are stored at the site level, all pages render against them, changing a token re-renders all pages from cached component trees (no LLM call needed).
    - For ambitious changes ("make the whole site more playful"), the system runs a multi-page refine — but warns the user this will modify 8 pages and asks for confirmation.
20. **Shared regions** — header, footer, nav are all defined ONCE at the site level. Editing them updates every page.
    - In the canvas, the shared regions render with a subtle striped indicator on hover ("Shared across all pages") so the user knows changes propagate.
    - The "site nav editor" modal (toolbar button) is the dedicated surface for editing the nav — add/remove links, reorder, set link target pages, customize per-breakpoint behavior.
21. **Page-specific override** — sometimes a single page needs a different header (e.g., a landing page wants a hero with no nav). The user can right-click the header on that specific page → "Override on this page" → it becomes a unique component instance for that page only.

### Phase 7 — Routing & Flow

22. Pages are connected by inferred or explicit links:
    - Navigation links (header, footer, in-page CTAs) automatically create flow edges to the linked page.
    - The user can manually draw additional edges in the canvas (same xyflow primitive as V2-02 mobile flows).
    - Edges are labeled with the trigger ("Home → /pricing via 'View pricing' button").
23. Forge detects orphan pages — pages with no incoming edges. Surfaces a warning in the chat panel: "Your /thank-you page isn't linked from anywhere. Add a link or remove?"
24. The user can preview the site as if browsing — clicking a link in the rendered desktop frame navigates to the linked page node (auto-pans the canvas to it).

### Phase 8 — Forms Within Pages

25. A web page can include a form section. Forge's existing form builder (W-01) is reused — the form section embeds a fully-functional form spec.
26. Form data still flows through Forge's submission system (analytics tracked, owner notified, automation chain runs) even when the form is part of a multi-page website. The user gets the "never deal with a database" promise even for multi-page sites.
27. Booking-enabled forms (with the calendar slot picker from W-01) work the same way inside any page on the site.

### Phase 9 — Responsive Preview Rendering

28. The three-breakpoint preview is more than aesthetic — it's the user's confidence that the site works on phones.
29. Hovering a breakpoint in a page node:
    - Shows a small overlay with the exact pixel dimensions ("1440 × 900").
    - Highlights any responsive issues (e.g., text overflowing, image too wide, touch target too small).
    - "Test in browser" button opens that breakpoint in a real browser for manual verification.
30. **Auto-detection of responsive issues** — a small linter runs after every generation/edit:
    - Touch targets < 44px on mobile breakpoint.
    - Horizontal overflow on mobile.
    - Font sizes < 14px on mobile.
    - Click targets too close together.
    Flags appear as small chips on the affected breakpoint with click-to-explain. Most are auto-fixable via a refine pass.

### Phase 10 — Export Pipelines

31. **Static HTML export** — the simplest path. Bundles all pages as `.html` files with a shared `styles.css` and `assets/` folder.
    - Produces a clean directory structure: `index.html`, `about.html`, `pricing.html`, etc.
    - Internal links use relative paths.
    - Forms can either keep pointing to Forge's submission endpoint (works as long as the org maintains a Forge subscription) or be rewritten to a placeholder (`<form action="REPLACE_WITH_YOUR_BACKEND">`).
    - Output: a downloadable zip.
32. **Next.js project export** — for users who want to deploy and develop further:
    - Generates an `app/` directory with one route per page using the App Router pattern.
    - Components are clean, reusable React components in `components/`.
    - Tailwind config is included with the brand tokens baked in.
    - A `README.md` explains how to deploy on Vercel/Netlify.
    - Form submission endpoints can be Forge-pointed or stubbed.
33. **Framer / Webflow export** — lower-priority but valuable. Produces a JSON file in Framer's importable format, and a separate one in Webflow's format. Tested via the official import paths.
34. **Figma export** — same as V2-02. Each page becomes a Figma frame at desktop dimensions; tablet and mobile breakpoints are sibling frames in the same Figma file.
35. **Hosted Forge mini-app** — the default path. The website is published at `/p/{org_slug}/{site_slug}/` with all pages reachable. Custom domains supported.

### Phase 11 — Page Detail Integration

36. The Page Detail surface for `web_page` (single page) shows the same Canvas / Export / Analytics / Settings tabs as the mobile workflow.
37. For `website` (multi-page), the Page Detail's structure is slightly different:
    - **Hero**: a smaller canvas preview showing the homepage; a "View all pages" button opens the full canvas.
    - **Tabs**: Pages (default) · Canvas · Flow · SEO · Forms · Export · Analytics · Settings.
    - **Pages tab** is a list of all pages in the site with status (Live / Draft), last-edited time, view count. Click any to jump into the canvas focused on that page.
    - **SEO tab** lets the user configure per-page SEO (title, description, og:image, canonical URL) without leaving the dashboard.
    - **Forms tab** aggregates submissions across any forms embedded in any page on the site.

### Phase 12 — Performance & Scale

38. A typical website is 5-15 pages. The canvas handles up to 50 pages without degradation:
    - Below 25% zoom, browser-frame nodes render as low-fi thumbnails (one rectangle per breakpoint with a page title).
    - Pan/zoom uses the same culling strategy as V2-02 mobile.
39. Generation budgets:
    - Single-page generation: 8 seconds p95 (same as before — this is W-04 territory).
    - 5-page site: 30 seconds p95 (outline + parallel pages + cross-page review).
    - 10-page site: 60 seconds p95.
40. Multi-page sites cost more — scale the cost-per-tier budget from O-02 accordingly. A free-tier user can build a 3-page site; Pro can build 10 pages; Max gets 25 pages per site. Documented in the pricing page (V2-04).

### Phase 13 — Tests

41. Snapshot tests for the new web component catalog including responsive variants at all three breakpoints.
42. Multi-page orchestration: prompt a 5-page site, verify Stage 1 outline is editable, Stage 2 parallelizes, Stage 3 review catches inconsistencies in a planted bad case.
43. Site-wide style sync: change accent color, verify all pages re-render with the new color and no LLM call fires.
44. Shared region edit: change the header, verify all pages reflect the change. Override on one page, verify only that page shows the override.
45. Routing: generate a multi-page site, verify nav links create flow edges, verify orphan-page detection catches a synthetic orphan.
46. Form embed: embed a form in a page, submit it, verify submission lands in Forge's submissions table.
47. Responsive linter: plant a synthetic responsive issue (overflowing text), verify the linter flags and auto-fix runs.
48. Export validity: every export format produces working output. HTML zip extracts and opens in a browser. Next.js project builds with `pnpm install && pnpm build`. Figma file is valid Figma format.
49. End-to-end Playwright: pick "Website" workflow, prompt a 4-page coffee-shop site, verify all 4 pages generate, edit a region on the about page, change the brand color, export to HTML, verify the zip contains 4 .html files with the new color applied.

### Phase 14 — Documentation

50. `docs/architecture/WEB_CANVAS.md` — the multi-page orchestration, responsive rendering, export pipeline.
51. `docs/user/WEB_DESIGN_GUIDE.md` — user-facing how-to with embedded videos. Includes a "Single page vs full site — which workflow do I pick?" decision tree.
52. Update the existing `W04_WORKFLOW_INTEGRATION.md` to acknowledge the new mobile + web canvas workflows in the Studio empty-state picker (now 8 tiles instead of 6).
53. Mission report.

---

## Acceptance Criteria

- Web canvas renders one or many pages, each with desktop / tablet / mobile breakpoints.
- Multi-page site generation produces 5-10 coherent pages with shared nav and footer.
- Site-wide style sync updates all pages from the Tweaks panel without LLM calls.
- Shared regions (header / footer / nav) edit once and propagate; per-page override works.
- Routing edges are created from nav links and detectable manually.
- Forms embed cleanly into pages and route through Forge's submission system.
- Responsive linter catches mobile-breakpoint issues and offers auto-fix.
- Five export pipelines produce valid output: static HTML zip, Next.js project, Framer JSON, Webflow JSON, Figma frames.
- Page Detail for single-page and multi-page web variants shows appropriate tabs.
- Performance targets met (50 pages at 60fps; latency budgets per generation tier).
- All tests pass.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
