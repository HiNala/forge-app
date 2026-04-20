# Data Model Overview — Forge

## Narrative

Forge's data model tells the story of a single user journey: **sign up → create a workspace → build a page → publish it → receive submissions → automate responses → track engagement.**

### The Tenant Foundation

Everything starts with **Users** and **Organizations**. A User is a human with credentials (managed by Clerk). An Organization is a workspace — the unit of billing, brand identity, and data isolation. The link between them is a **Membership**, which carries a role: `owner`, `editor`, or `viewer`. A user can belong to multiple organizations (e.g., Lucy manages Reds Construction and a personal workspace). An **Invitation** is a pending Membership waiting for a click.

Every row that "belongs to" a tenant carries an `organization_id` column and is protected by PostgreSQL Row-Level Security. The `users` table is the exception — it's global because users span organizations.

### Brand Identity

Each Organization has one **BrandKit**: primary color, secondary color, logo URL, display font, body font, and a voice note (passed to the LLM for copy style). When a page is published, the brand kit is snapshotted into the `Page.brand_kit_snapshot` JSONB column so future brand changes don't retroactively alter live pages.

### The Page Lifecycle

A **Page** is the core artifact. It has a type (`booking_form`, `proposal`, `gallery`, etc.), a current HTML representation, an optional form schema (JSONB), and a status (`draft`, `live`, `archived`). Pages belong to an Organization and have a unique slug within that org.

When a page is published, a **PageVersion** is created — an immutable snapshot of the HTML + form schema at that moment. The page's `published_version_id` points to the live version. This allows Undo to a previous published state.

During editing, **PageRevisions** track each individual edit (full-page or section-targeted). These are the undo history within a Studio session. They're cleaned up after 30 days.

### The Conversation Thread

Each Page has a **Conversation** — the Studio chat history. **Messages** within the conversation carry a role (`user`, `assistant`, `system`). The conversation provides context for refinement: when Lucy says "make the hero more serious," the AI reads the prior messages to understand what "the hero" refers to.

### Submissions & Files

When an end customer fills out a form on a live page, a **Submission** is created. The payload (all field values) is stored as JSONB. File fields store a small JSON object (`storage_key`, `file_name`, `size_bytes`, `content_type`) after the object exists in blob storage; **SubmissionFile** rows mirror that for admin download and auditing. **SubmissionReplies** track emails sent back to the submitter.

**Lifecycle:** `new` → `read` (opened) → `replied` (email sent) or `archived` (bulk or manual). Quotas enforce monthly submission limits per plan.

Submissions are partitioned by month (range partitioning on `created_at`) because they grow unboundedly and we need efficient time-range queries.

### Custom domains

A **CustomDomain** ties a verified DNS hostname to an organization (and optionally a specific page). Verification uses a DNS TXT/CNAME workflow; `verified_at` must be set before the edge proxy will obtain a certificate and route traffic. This keeps TLS issuance aligned with tenants you actually serve.

### Automations

Each Page can have one **AutomationRule** that configures: notification emails (up to 5), confirmation email template, and calendar sync settings. When a submission arrives, the automation pipeline runs in the background via arq:

1. **Notify** — send email to the page owner
2. **Confirm** — send confirmation to the submitter
3. **Calendar** — create a Google Calendar event

**CalendarConnections** store encrypted OAuth tokens. **AutomationRuns** track the status of each pipeline step for observability and retry.

### Analytics

**AnalyticsEvents** is an append-only, partitioned event log. Events include: page views, section dwell times, CTA clicks, form starts, field touches, form submits, form abandons, proposal accept/decline. Each event has a cookie-based `visitor_id` for continuity without PII.

Analytics are partitioned monthly with 90-day default retention.

### Billing & Usage

**SubscriptionUsage** tracks AI consumption per organization per month: pages generated, section edits, prompt tokens, completion tokens, estimated cost. This feeds the billing dashboard and quota enforcement.

### Templates (Post-MVP)

**Templates** are curated starter pages. They're global (no `organization_id`). When used, they're cloned into a new Page draft with the user's brand kit applied.

## Entity Relationship Summary

```
User ──< Membership >── Organization
Organization ──── BrandKit (1:1)
Organization ──< Page
Page ──< PageVersion
Page ──< PageRevision
Page ──── Conversation (1:1)
Conversation ──< Message
Page ──< Submission (partitioned)
Submission ──< SubmissionFile
Submission ──< SubmissionReply
Page ──── AutomationRule (1:1)
User ──< CalendarConnection
AutomationRule ──< AutomationRun
Page ──< AnalyticsEvent (partitioned)
Organization ──< SubscriptionUsage
Organization ──< CustomDomain
```
