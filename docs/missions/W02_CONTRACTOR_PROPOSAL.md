# WORKFLOW MISSION W-02 — Contractor Proposal Builder

**Goal:** Turn Forge into a proposal platform a contractor can actually use to win bids. The user describes a job ("I need a proposal for a 12-foot fence installation for the Johnson property — 3 days labor at $65/hour, materials $2,400, start next week"), Forge generates a polished, branded proposal page with every section a winning proposal needs — cover, scope of work, line-item pricing, timeline, terms, and an acceptance signature. The client reads it in the browser, can ask questions inline, and clicks Accept to legally commit. After this mission, a contractor can go from "I need to send John a quote" to "John signed it at 2:47pm, should I start Monday?" in 10 minutes instead of 3 hours.

**Branch:** `mission-w02-proposal-builder`
**Prerequisites:** Backend Infra BI-01–BI-04 complete. Orchestration O-01 and O-02 produce form/page drafts. The email and branded-template systems from BI-04 are operational.
**Estimated scope:** Medium-large. New data model for proposals, new generative path in orchestration, new interactive public page, e-signature flow, PDF export, change-order handling.

---

## Experts Consulted On This Mission

- **Steve Jobs** — *What is the one thing that matters here? For the contractor: signature. For the client: clarity. Design for both.*
- **Don Norman** — *Does the client know exactly what they're agreeing to when they click Accept?*
- **Nielsen** — *Can a reader scan the proposal in 30 seconds and understand price + scope + timeline?*
- **Tony Fadell** — *What happens after Accept? That loop has to be as good as the pre-signature experience.*

---

## How To Run This Mission

Read User Case Report Flow 7 (Proposal workflow). Read the research notes from `docs/research/CONTRACTOR_PROPOSALS.md` (compiled from Mission 00 docs research). The 95%-of-winning-proposals structure is well-established: cover letter, company background, scope of work, pricing breakdown, timeline, terms, exclusions, acceptance.

The discipline here: **proposals are legal documents with a layer of design.** Every generated proposal must include the same structural elements a human-written proposal would — not because of arbitrary taste, but because customers and their lawyers expect them. Forge's value is the speed and polish, not skipping the scope section.

Commit on milestones: proposal data model, Studio generates real proposals, public proposal page renders, signature flow, PDF export, change orders, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Proposal Data Model

1. Create migration adding specialized proposal columns alongside the base `pages` fields (JSONB in `pages.intent_json` is fine for some, but proposals have enough structure to deserve dedicated storage):
    ```sql
    CREATE TABLE proposals (
      page_id UUID PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      proposal_number TEXT,  -- auto-generated, e.g., "RC-2026-0142"
      client_name TEXT NOT NULL,
      client_email CITEXT,
      client_phone TEXT,
      client_address TEXT,
      project_title TEXT NOT NULL,
      project_location TEXT,
      executive_summary TEXT,
      scope_of_work JSONB NOT NULL,  -- [{phase, description, deliverables: [...]}]
      exclusions JSONB DEFAULT '[]'::jsonb,
      line_items JSONB NOT NULL,  -- [{category, description, qty, unit, rate_cents, total_cents}]
      subtotal_cents BIGINT NOT NULL DEFAULT 0,
      tax_rate_bps INT DEFAULT 0,  -- basis points, e.g., 800 = 8.00%
      tax_cents BIGINT NOT NULL DEFAULT 0,
      total_cents BIGINT NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      timeline JSONB NOT NULL,  -- [{milestone, date, description}]
      start_date DATE,
      estimated_completion_date DATE,
      payment_terms TEXT NOT NULL,
      payment_schedule JSONB,  -- [{stage, percent_or_amount, when}]
      warranty TEXT,
      insurance TEXT,
      license_info TEXT,
      legal_terms TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','questioned','accepted','declined','expired','superseded')),
      sent_at TIMESTAMPTZ,
      first_viewed_at TIMESTAMPTZ,
      decision_at TIMESTAMPTZ,
      decision_by_name TEXT,
      decision_by_email CITEXT,
      decision_ip INET,
      decision_user_agent TEXT,
      decision_signature_data TEXT,  -- base64 PNG of drawn signature OR typed name
      decision_signature_kind TEXT CHECK (decision_signature_kind IN ('drawn','typed','click_to_accept')),
      signed_pdf_storage_key TEXT,  -- generated on acceptance
      parent_proposal_id UUID REFERENCES proposals(page_id),  -- for change orders / versions
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
    RLS enabled via `organization_id`.
2. `proposal_number` auto-generated on first save: `{org_prefix}-{year}-{zero-padded-sequence}`. The org prefix is derived from the org name (first 2-3 uppercase chars) or configurable in org settings. Sequence resets annually.
3. Create `proposal_questions` — inline questions from the client:
    ```sql
    CREATE TABLE proposal_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      asker_name TEXT,
      asker_email CITEXT NOT NULL,
      section_ref TEXT,  -- which proposal section the question is about
      question TEXT NOT NULL,
      answer TEXT,
      answered_by UUID REFERENCES users(id),
      answered_at TIMESTAMPTZ,
      asker_ip INET,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_proposal_questions_page ON proposal_questions(page_id, created_at DESC);
    ```
    RLS enabled.

### Phase 2 — Orchestration: Proposal Intent Parser

4. Extend the intent parser (orchestration mission O-02) to recognize proposal intent. Keywords: "proposal", "bid", "quote", "estimate", "scope of work", "project for". When detected, switch to the Proposal pipeline (defined in Phase 3).
5. The proposal intent schema (Pydantic):
    ```python
    class ProposalIntent(BaseModel):
        page_type: Literal['proposal'] = 'proposal'
        client: ClientInfo
        project: ProjectInfo
        scope_items: list[ScopeItem]
        line_items: list[LineItemDraft]
        timeline: list[Milestone]
        payment_terms: str | None = None
        expires_in_days: int = 30
        special_terms: list[str] = []  # e.g., "requires HOA approval", "weather-dependent"
    ```
6. The parser runs a first-pass extraction: given the user's prompt + any attached context (a quote sheet, a brief conversation transcript), populate as much of the schema as possible. Missing fields get reasonable defaults (e.g., `payment_terms = "50% deposit, 50% on completion"` if not specified).

### Phase 3 — Proposal Generation Pipeline

7. In the orchestration layer, create a dedicated `ProposalComposer` agent (plugs into O-03). Steps:
    - **Cover writer** — generates the executive summary paragraph. Style-matched to the org's voice note.
    - **Scope expander** — takes high-level scope items and expands each into a full description + deliverables list. Uses a known-good "good scope of work" style guide in its system prompt.
    - **Pricing formatter** — takes line items, computes subtotals/tax/total, generates a clean presentation (grouped by category: materials, labor, overhead).
    - **Timeline builder** — takes milestones and converts to a Gantt-friendly list with start/end dates.
    - **Terms selector** — pulls boilerplate legal terms from a library of vetted templates, adapted to state/jurisdiction if known. Includes warranty, insurance, change-order procedure, dispute resolution.
    - **Page composer** — assembles the rendered HTML using the design system's proposal components.
8. The Composer's component library includes proposal-specific blocks:
    - **Cover hero** — logo, proposal number, date, expires date, client info on one side, org info on the other.
    - **Executive summary block** — Cormorant Garamond quote-style pullout.
    - **Scope of work timeline** — phase cards with deliverables bullet lists.
    - **Line items table** — grouped by category, with subtotals, tax, grand total in a prominent call-out at the bottom.
    - **Timeline visualization** — horizontal milestone chart (simple SVG).
    - **Terms accordion** — each term section collapsible for scanning.
    - **Acceptance block** — signature pad + "Accept" button + decline link.
9. The HTML is deterministic and has `data-forge-section` attributes on every block so:
    - Section-click editing works (refine the scope section, refine the pricing, etc.).
    - Analytics track which sections the client spent time on (scroll depth per section, dwell time).
10. Pricing math runs server-side. The model produces draft numbers; the Composer recomputes totals so the page always matches. Tax rate comes from org settings or a per-proposal override.

### Phase 4 — Studio UX for Proposals

11. When the intent parser identifies a proposal, Studio's right panel's preview pane shows a proposal-specific top banner: "Proposal {proposal_number} for {client_name}" with quick-access buttons: Edit client info, Edit line items, Preview for client.
12. Refine chips adapted for proposals:
    - "Add a materials line for {item}"
    - "Change labor rate to ${rate}/hr"
    - "Extend timeline by {duration}"
    - "Add a section for exclusions"
    - "Make the terms more formal / more casual"
13. A dedicated "Line items editor" surface: click on any line item row in the preview to open a side panel with editable fields (description, qty, unit, rate). Changes instantly refresh the preview and recompute totals. No LLM round-trip needed for numeric edits — pure frontend state + PATCH to backend.
14. "Save as template" button in the Studio chat panel — lets the user save a successful proposal structure as a reusable starting point for future proposals. Stored in a new `proposal_templates` table scoped to the org.

### Phase 5 — Public Proposal Page

15. The public proposal page (rendered by `GET /p/{org_slug}/{page_slug}`) has a reading-optimized layout:
    - Hero section with org branding, proposal number, client name, expiration countdown.
    - Sticky side navigation with section jumps (Overview, Scope, Pricing, Timeline, Terms, Accept) — collapses to a hamburger on mobile.
    - Smooth scroll between sections.
    - Print-friendly CSS for clients who want hard copy.
    - Every section has a timestamp footer ("This proposal was generated by {org} on {date}").
16. Inline question affordance: a small "?" icon next to every major block. Click opens a textarea "Question about this section?" + email field. Submits to `POST /p/{slug}/proposal/question`, which creates a `proposal_questions` row and notifies the owner via email + in-app notification.
17. Owner answers the question from the Page Detail's Proposals subtab (a new view added to F-05's Page Detail). Reply goes back to the client's email AND optionally becomes a public Q&A bubble next to the original question on the proposal page (with the asker's name, if they opt-in).
18. View tracking: when the page is first loaded, fire an event that updates `proposals.first_viewed_at`. Sends an owner notification "John opened your proposal at 2:14pm." Scroll depth per section tracks engagement.

### Phase 6 — Acceptance Flow

19. The Accept block at the bottom has three acceptance methods (configurable per proposal, default: all three allowed):
    - **Click to accept** — a simple checkbox + button. "I, {name}, have read and agree to this proposal." Requires name + email.
    - **Typed signature** — text input, renders the typed name in a cursive font ("Let me sign here"). Same legal weight as click-to-accept in most jurisdictions.
    - **Drawn signature** — a canvas pad. Mouse or touch draw. Outputs a base64 PNG.
20. All acceptance methods capture: name, email, phone (optional), timestamp, IP, user-agent, acceptance method.
21. On Accept:
    - Atomically flip `proposals.status = 'accepted'`, set `decision_at`, `decision_by_*`, `decision_signature_*`.
    - Generate a "signed PDF" of the proposal via `page_to_pdf` worker job (uses Playwright to render the final public page to PDF, adds a signed-at footer, stores to S3 at `{org_id}/signed_proposals/{proposal_number}.pdf`).
    - Save the PDF storage key to `signed_pdf_storage_key`.
    - Email both parties: owner gets "Your proposal for {project_title} was accepted", submitter gets "Thanks for accepting — here's your signed copy" with PDF attached.
    - Create an owner in-app notification that lands in the Dashboard.
    - If the calendar integration is active on the org, optionally add the start date to the owner's calendar as a "Work begins: {project_title}" event.
22. Decline flow: similar, but captures an optional reason textarea. Owner gets notified. Page shows "This proposal was declined on {date}" going forward.
23. Expiration: when a proposal's `expires_at` passes without a decision, a worker job flips status to `expired` and emails the owner + client ("This proposal has expired — would you like to extend?"). The public page shows an expired banner but remains accessible.

### Phase 7 — Change Orders & Versions

24. Change order flow: from a viewed or questioned proposal, owner can click "Create change order" in the Page Detail. This:
    - Creates a NEW proposal page with `parent_proposal_id` set to the current page's ID.
    - Pre-fills all fields from the parent.
    - Opens in Studio for edits.
    - When published, sends a notice to the client with a link to the new version.
    - The old proposal's status flips to `superseded`.
25. On the Page Detail for a proposal, show the version chain if any — useful context for both Lucy and the client.
26. Questions carry forward: any unanswered `proposal_questions` on the parent get copied to the change order as a reminder.

### Phase 8 — PDF Export (On-Demand and Post-Signature)

27. `GET /api/v1/pages/{page_id}/proposal/pdf?version=draft|signed` — generates a PDF:
    - `draft`: renders the current state. Useful for sending a copy outside the tracked flow (email attachment for an RFP response).
    - `signed`: requires the proposal to be accepted; returns the stored signed PDF. 404 if not yet signed.
28. PDF generation uses Playwright in the worker container — same container that handles page_screenshot. Has a dedicated `proposal_pdf_render` job with a 60s timeout.
29. PDF styling includes page headers/footers ("Page N of M", proposal number, org name). Ensures the PDF is printable and signatures are visible on the last page.

### Phase 9 — Analytics (Proposal-Specific)

30. The Page Detail's Analytics tab adapts to `page_type='proposal'` (F-06 covered this):
    - Hero KPIs: Views · Unique viewers · Max scroll reached · Decision (none / accepted / declined / expired).
    - **Section engagement heatmap** — horizontal bars showing median dwell time per section. If clients spend 2 minutes on pricing but 5 seconds on scope, Lucy learns to make her scope section more scannable.
    - **Question-to-decision correlation** — proposals with questions have N% acceptance rate vs those without. Shown as insights at the bottom.
    - **Time-to-decision** — histogram of hours between sent and decided across the org's proposals.
31. Org-wide proposal dashboard view at `/analytics/proposals`:
    - Active proposals count + total pipeline value.
    - Accepted this month (count + revenue).
    - Average time-to-acceptance.
    - Top 10 best-performing scope phrases (text analysis of scope sections in accepted proposals).

### Phase 10 — Templates & Library

32. `proposal_templates` table — scoped to the org, saved versions of proposal structures.
    ```sql
    CREATE TABLE proposal_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      scope_blueprint JSONB NOT NULL,
      line_items_blueprint JSONB,
      terms_template TEXT,
      use_count INT NOT NULL DEFAULT 0,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
33. `POST /api/v1/orgs/current/proposal-templates` / CRUD — standard.
34. `POST /api/v1/orgs/current/proposal-templates/{id}/use` — creates a new proposal page pre-filled from this template. The user still names the client, project, and dates in Studio — the template just skips the cold-start.
35. A small starter library is shipped per industry (contractor, freelance designer, freelance developer, marketing consultant, coaching) as seed data for new orgs. Users can customize or discard.

### Phase 11 — Client-Side Trust Signals

36. Every public proposal page shows small trust signals (configurable per org):
    - License number (if configured in org settings).
    - Insurance carrier + policy number.
    - "Bonded and insured" badge (with dollar amount).
    - Better Business Bureau rating link (if configured).
    - Testimonials carousel (3 short testimonials, optional — from a new `org_testimonials` table).
    - Years in business ("{n} years serving {region}").
37. These signals are configured in Settings → Brand Kit → Business Credentials. They appear on every proposal unless the user opts out per-proposal.

### Phase 12 — Legal Guardrails

38. Every generated proposal includes these mandatory sections (the Composer refuses to skip them):
    - A "This is a proposal, not a contract until accepted" disclaimer in the header.
    - Explicit statement of the acceptance mechanism ("By clicking Accept below, you agree to the terms above").
    - Terms of cancellation / refund.
    - Warranty period (or explicit "No warranty" if specified).
    - Change order procedure.
    - Governing law / jurisdiction (pulled from org's state if configured, or a safe default).
39. The Composer's system prompt explicitly lists these as non-negotiable sections. If the user's prompt omits them, they're added with sensible boilerplate and flagged in the Studio chat: "Added standard warranty and change-order terms — review in the Terms section."
40. Disclaimer in the onboarding and every proposal footer: "Forge is not a law firm and does not provide legal advice. Consult a licensed attorney for legal questions."

### Phase 13 — Tests

41. Test: proposal intent parser extracts all structured fields from a realistic freeform prompt.
42. Test: pricing math is correct — line items sum to subtotal, tax is applied correctly, total matches.
43. Test: every mandatory section is present in the generated HTML.
44. Test: public page renders, scroll tracking works, question submission creates a row.
45. Test: all three acceptance methods fire the same acceptance workflow and produce a valid signed PDF.
46. Test: change order creates a child proposal with parent_id set, old proposal's status → superseded.
47. Test: expiration worker flips status after expires_at.
48. Test: PDF renders correctly in the worker container (visual snapshot test).
49. End-to-end demo: create a proposal in Studio, share the URL, accept it as a "client", verify all notifications and the signed PDF.

### Phase 14 — Documentation

50. Write `docs/workflows/CONTRACTOR_PROPOSAL.md` — concept docs, examples, gotchas.
51. Write `docs/runbooks/PROPOSAL_LEGAL.md` — the legal guardrails + how Forge's mandatory sections protect both parties.
52. Mission report.

---

## Acceptance Criteria

- Contractor can generate a complete, professional proposal in under 5 minutes from a plain-English prompt.
- Every mandatory section is present; the Composer refuses to omit them.
- Pricing math is correct and server-recomputed.
- Public proposal page is readable, responsive, and instrumented for engagement analytics.
- All three acceptance methods (click, typed, drawn) work and produce a signed PDF.
- Change orders correctly version the proposal chain.
- Inline questions flow between client and creator.
- Expiration is automatic and communicated.
- Template library works; at least 5 starter templates exist.
- All tests pass; end-to-end demo completes.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
