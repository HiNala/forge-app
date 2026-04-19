# MISSION 09 — Template Library

**Goal:** After Forge is live, add the template library. This is a post-launch feature that dramatically reduces the cost of the user's first page — they can start from a curated, on-brand, already-built page instead of describing one from scratch. Templates are the marketing surface too: each template is a public showcase URL demonstrating what Forge can do. After this mission, a new user can ship a polished page in 30 seconds instead of 5 minutes.

**Branch:** `mission-09-templates`
**Prerequisites:** Missions 00–08 complete. Forge is live in production. Templates is a value-add feature, not a blocking one.
**Estimated scope:** Small-medium. Mostly content creation + a simple CRUD + a gallery UI.

---

## How To Run This Mission

Templates are content as much as they are software. Each template is a curated artifact: a handpicked combination of page type, layout, copy, field set, brand-neutral colors, and a representative preview image. The quality bar is: **a template should be immediately usable by a real business without modification.** If it looks like a generic wireframe, it's not ready.

The pattern is: the Forge team (starting with Brian) generates candidate templates in the normal Studio flow, then curates the best ones into the global `templates` table. There is no user-generated template marketplace in this mission — that's a future phase.

Commit on milestones: template CRUD endpoints live, curated templates seeded, gallery UI live, use-a-template flow working.

**Do not stop until every item is verified complete. Do not stop until every item is verified complete. Do not stop until every item is verified complete.**

---

## TODO List

### Phase 1 — Template Data & Endpoints

1. Review the `templates` table from Mission 01. Confirm it has: id, name, description, category, preview_image_url, html, form_schema, intent_json, is_published, sort_order, created_at, updated_at. Add any missing columns in a new Alembic migration (e.g., `preview_page_slug` if we want each template hosted as a live preview URL).
2. Implement `GET /api/v1/templates` — list published templates, optionally filtered by category. This is a public-authenticated endpoint (any authenticated user can browse).
3. Implement `GET /api/v1/templates/{id}` — template detail including preview image and full HTML.
4. Implement `POST /api/v1/templates/{id}/use` — the core flow. Clones the template's HTML, form_schema, and intent_json into a new Page draft in the caller's active organization. Applies the org's brand kit (re-composes with fresh brand tokens). Returns the new page's ID and redirects the user to Studio with the page open.
5. Implement admin-only endpoints `POST /api/v1/admin/templates`, `PATCH /api/v1/admin/templates/{id}`, `DELETE /api/v1/admin/templates/{id}` — gated by the `is_admin` claim from Mission 06.
6. Auto-generate preview images: when a template is created or updated via admin, a background job takes a screenshot of the template's HTML using Playwright running in the worker container. Screenshot is stored to R2 and the URL saved on the template.

### Phase 2 — Curated Template Set

7. Generate the first 24–32 templates, organized across categories:
    - **Forms (8):** Contractor Small Jobs Form, Event RSVP, Tutoring Inquiry, Photography Consultation, Restaurant Reservation, Auto Repair Estimate, Daycare Enrollment, Lawn Care Request
    - **Proposals (4):** Freelance Design Proposal, Construction Project Bid, Marketing Services Proposal, Coaching Package Proposal
    - **Landing Pages (6):** Product Launch, Waitlist, Event Registration, Course Enrollment, Podcast Episode, Newsletter Signup
    - **Menus (3):** Coffee Shop Menu, Food Truck Menu, Prix Fixe Dinner
    - **Galleries (3):** Photography Portfolio, Art Show, Real Estate Listing
    - **Event RSVPs (2):** Wedding RSVP, Workplace Event
    - **Promotions (2):** Holiday Sale, Flash Discount
    - **Booking (4):** Consultation Slot, Studio Time, Workshop Signup, Tour Booking
8. Each template is generated via Forge's own Studio, reviewed for quality, edited by hand as needed, then inserted into the templates table via an idempotent seed script (`apps/api/scripts/seed_templates.py`).
9. Each template has: a specific name ("Contractor Small Jobs Form" not "Form Template 3"), a one-sentence description, a category tag, realistic placeholder copy (actual job descriptions, not "lorem ipsum"), a realistic field set (phone formats, date pickers, address fields where appropriate), a brand-neutral palette (works on any BrandKit overlay without clashing), and a clean preview screenshot.
10. Quality sanity check: a Forge team member opens each template in incognito, verifies Lighthouse ≥ 95, verifies WCAG AA, verifies the form renders and submits correctly.

### Phase 3 — Templates Gallery UI

11. Build the gallery at `(app)/templates/page.tsx`. Grid layout, preview image + title + category chip + "Use template" button on hover.
12. Filter by category in a horizontal chip row above the grid.
13. Search box for template name/description.
14. Each template has a detail modal (not a separate route) showing: larger preview, full description, sample fields, and two actions: "Use template" (creates the page and opens Studio) and "Preview live" (opens the template's hosted preview URL in a new tab).
15. Gallery is also reachable from Studio empty-state as a secondary path: next to the input, a subtle "Browse templates" link.

### Phase 4 — Live Template Previews

16. Each published template has a live preview URL at `forge.app/examples/{template-slug}`. This is public (no auth). Useful for marketing pages to link into.
17. These preview URLs are static-generated at build time via Next.js `generateStaticParams`, so they're instant to load.
18. The "Preview live" button on the template detail modal opens this URL in a new tab.

### Phase 5 — Template Use Flow

19. Clicking "Use template" calls `POST /api/v1/templates/{id}/use`. On success, navigate to `(app)/studio?pageId={new_page_id}`.
20. Studio opens with the new page already rendered in the preview pane. The chat feed shows an assistant message: "Started from the *{template_name}* template. What would you like to change?" Plus the standard refine chips.
21. The user's first edit creates a PageRevision as usual. The template use itself is tracked as a PageRevision with `edit_type = "template_applied"`.
22. If the template's color scheme clashes severely with the user's brand kit, we do a smart color-swap in the page composer step — replacing the template's hardcoded accent with the user's primary. This logic is template-specific and lives in a small helper.

### Phase 6 — Analytics for Templates

23. Track template usage as an analytics event: `template_used` with metadata `{template_id, user_id, org_id}`. This is internal product analytics (PostHog), not user-facing analytics.
24. Admin dashboard shows: top templates used, template use-to-publish conversion (how often does a user who started from a template actually publish?), average number of refinements after using a template.
25. Use this data to iterate the template library — retire low-performing templates, double down on what works.

### Phase 7 — Marketing Integration

26. Update the marketing pages (`(marketing)/` routes) to feature the template library prominently. Homepage has a "Browse templates" section with 6 highlighted cards.
27. Each marketing template card links to the live preview URL and, from there, to a "Sign up and use this template" CTA that deep-links into signup with a `?template={id}` query param. After signup, automatically calls `POST /api/v1/templates/{id}/use` and lands the user in Studio.
28. SEO: each live preview page has appropriate meta tags, Open Graph images, structured data for the page type.

### Phase 8 — Admin UI for Template Management

29. Build `(app)/admin/templates/page.tsx` — the internal admin surface for Digital Studio Labs to curate templates. List, create, edit, publish/unpublish, reorder, delete.
30. "Create template from existing page" flow: given a page the team built, one-click converts it to a template (copies HTML, form_schema, and intent to a new template row with editable metadata).
31. Preview image regeneration: "Regenerate preview" button re-runs Playwright.
32. Category management: add/remove categories without migrations (categories are a TEXT column, not an enum).

### Phase 9 — Tests & Polish

33. Test: use-template end-to-end — a user clicks "Use template," ends up in Studio with the expected page, brand kit is applied.
34. Test: admin-only endpoints reject non-admin users with 403.
35. Test: unpublished templates do not appear in public listings.
36. Test: Playwright preview screenshot generation produces a valid PNG.
37. Test: live preview URLs are static-generated and load in under 500ms.
38. Visual review: open all 24+ templates, confirm quality bar is met.
39. Update the marketing pages with the template library section.
40. Mission report.

---

## Acceptance Criteria

- 24+ curated templates live in production, all published.
- Gallery UI works, filter and search work, each template has a preview image.
- Use-template flow creates a new page in the user's org with brand kit applied, lands them in Studio.
- Live preview URLs are reachable, fast, SEO-optimized.
- Admin UI allows creating, editing, reordering, publishing templates.
- Analytics tracking is in place.
- Marketing pages prominently feature templates with deep-link signup.
- All lint / typecheck / test pass.
- Mission report written.

---

## Repo tracking (living)

Template marketplace vs PRD “post-launch”: **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** (Mission **09 — Templates** in *By mission document*).

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**

---

## Post-Launch Roadmap (Out of Scope, for Reference)

After Mission 09, the templates feature opens several future paths worth noting for the next planning cycle:

- **User-submitted templates** — a marketplace where users can publish their own pages as templates, with optional monetization.
- **AI-suggested templates** — when a user types a prompt, the Intent Parser also surfaces the closest matching template as a "or start from this" option.
- **Template variants** — each template has 2-3 pre-built variants (minimal, warm, corporate) so users can pick a style without prompting.
- **Industry packs** — bundles of 5-10 templates for a specific vertical (contractors, restaurants, photographers, therapists). Sold as an add-on or used as a marketing lead magnet.

These are the seeds of Forge's next phase. This mission lays the data model and UI surface that makes any of them a small increment rather than a new subsystem.
