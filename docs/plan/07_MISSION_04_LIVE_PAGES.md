# MISSION 04 — Live Pages, Hosting & Submission Handling

**Goal:** Every page Lucy generates should now be something real — a URL she can share, a form her customers can actually submit, a submission table she can read. This mission publishes pages to live URLs (both on Forge subdomains and custom domains), accepts public submissions with file uploads, stores them with partitioning from day one, and gives Lucy an admin surface to review and reply. After this mission, Forge is a usable product.

**Branch:** `mission-04-live-pages-submissions`
**Prerequisites:** Mission 03 complete. Pages are generating. Studio works. Brand kit and tenant isolation are locked in.
**Estimated scope:** Medium — the generation flow is already in place; this mission operationalizes it.

---

## How To Run This Mission

Read the User Case Reports flows 4, 5, and 7. These define exactly how a live page should behave. Every decision in this mission traces back to those flows.

The bar here is: **a published page should feel as fast and trustworthy as a handcrafted Stripe or Linear page.** Under 80KB initial load, Lighthouse 95+ on mobile, no FOUC, no layout shift, works with JavaScript disabled (form still submits, just without the fancy UI). This is where the quality of the generated output actually gets tested in the wild.

Commit on milestones: publish flow working, public page rendering, submit endpoint live with file uploads, submissions admin table functional, reply flow working, CSV export.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Publish Flow

1. Implement `POST /api/v1/pages/{page_id}/publish`. Validate the page has valid HTML (re-run validator). Validate the slug is unique within the org. Create a new `PageVersion` row (snapshots current HTML, form_schema, brand_kit). Update `pages.status = 'live'`, `pages.published_version_id = <new_version.id>`.
2. On publish, warm the public page cache in Redis — write the assembled HTML + form schema at key `page:live:{org_slug}:{page_slug}` with no expiry (invalidated on next publish).
3. Implement `POST /api/v1/pages/{page_id}/unpublish` — flips status to draft. Removes public cache entry.
4. Implement `GET /api/v1/pages/{page_id}/versions` — list all PageVersions in reverse chronological order.
5. Implement `POST /api/v1/pages/{page_id}/revert/{version_id}` — copy the version's html + form_schema to the Page's current state and create a new PageVersion marking the revert.
6. Implement `POST /api/v1/pages/{page_id}/duplicate` — copy the page as a new draft in the same org. New UUID, slug = `{original_slug}-copy`.
7. Frontend: the Publish button in Studio / Page Detail opens a slug-confirmation modal. Pre-fills with a slug derived from the title. Validates slug uniqueness against the org inline.

### Phase 2 — Public Page Rendering

8. In the Next.js app, add the `(public)/p/[org]/[slug]/page.tsx` route. Uses `generateMetadata` for SEO. Fetches from `GET /api/v1/public/pages/{org_slug}/{page_slug}` — a new unauthenticated endpoint that serves the cached HTML from Redis.
9. Implement `GET /api/v1/public/pages/{org_slug}/{page_slug}` in FastAPI. No auth. Rate-limited by IP (120 req/min — generous for humans, blocks scraping). Returns cached HTML + form schema + CSP headers.
10. Serve the public page with strict CSP: `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'self' 'sha256-...'` (hash of the submission handler inline script). No external JS. No inline event handlers.
11. Inject the submission handler as a small inline script (~2KB) that progressively enhances the form: adds client-side validation, handles file uploads via presigned URLs, posts the final submission to `/p/{slug}/submit`. If JS is disabled, the form posts normally as `application/x-www-form-urlencoded` and the server handles it identically.
12. Pages load with pre-rendered HTML — no client-side framework on the public surface. Next.js `output: standalone` + `force-static` for maximum perf.
13. Implement "Open in new tab" preview — `(public)/p/[org]/[slug]?preview=true&token=...` renders a draft (non-cached) version if the token matches the current user's session. Only accessible to authenticated members of the org.

### Phase 3 — Custom Domains

14. Implement `POST /api/v1/pages/{page_id}/domain` — sets a custom domain for a page (or for an org-wide subdomain). Stores a `CustomDomain` row (create this table in a migration here; not in Mission 01 because it's scoped to this feature).
    ```
    custom_domains(id, organization_id, hostname UNIQUE, page_id NULLABLE, verified_at, created_at)
    ```
15. Generate a verification token. Frontend shows "Add a CNAME: `_forge_verify.yourdomain.com` → `verify-abc123.forge.app`" and a "Verify" button.
16. Implement `POST /api/v1/domains/{id}/verify` — performs a DNS TXT lookup and confirms the token. Marks `verified_at`.
17. Configure Caddy at the production edge with `on_demand_tls` and `ask` pointing to `https://api.forge.app/internal/caddy/validate?domain=...`. This endpoint returns 200 if the hostname is in the `custom_domains` table and verified, 404 otherwise. Caddy then fetches a cert from Let's Encrypt on-demand.
18. Route Caddy: any request with a Host header matching a verified custom domain routes to `web` service with the header preserved. The Next.js app extracts the hostname from `headers().get('host')`, looks up the CustomDomain → Page mapping, and serves that page.
19. MVP scope: one verified domain per page. Org-level subdomains (`forms.redsrrc.com` mapping to the whole org's page list) deferred.

### Phase 4 — Submission Endpoint (Public)

20. Implement `POST /p/{slug}/submit` as an unauthenticated FastAPI endpoint (route prefix matters — mount this outside `/api/v1` to keep the public URL clean and avoid breaking the middleware chain that auth endpoints need).
21. Accept `application/json` and `multipart/form-data`. The submission handler JS sends JSON after uploads; the fallback HTML form sends multipart.
22. Resolve the page from slug. Validate the submitted payload against the page's `form_schema`. If validation fails, return 422 with field errors.
23. Strip sensitive headers (remove `Authorization`, record `X-Forwarded-For` for rate limiting).
24. Insert a Submission row. Use the Page's current `published_version_id` so we know which form version the submitter saw.
25. Hash and anonymize the source IP to /24 before storing (GDPR hygiene).
26. Record an `analytics_events` row with `event_type=form_submit` for funnel analytics.
27. Fire the automation job (via arq: `enqueue_job('run_automations', submission_id=...)`). Do not wait — return 200 to the submitter immediately with `{ok: true}` and a redirect URL if set in the form schema.
28. Rate limit: 10 submissions/minute per IP, 100/hour per page. Configurable per plan tier in the future.

### Phase 5 — File Uploads

29. Implement `POST /p/{slug}/upload` — returns a presigned PUT URL to S3/MinIO with a max-size constraint. The submission handler JS uploads directly to storage (not through our backend, to avoid tying up workers on large uploads).
30. Validate file on the client (before upload): max size (10MB default, configurable in form_schema), MIME type whitelist (image/*, application/pdf for specific form fields).
31. After upload, the handler sends the storage key as part of the form submission payload. The backend then validates: (a) the key exists in storage, (b) the size matches what was claimed, (c) a MIME sniff confirms the declared type.
32. Create `SubmissionFile` rows after successful submission. Link the storage key back.
33. Implement `GET /api/v1/submissions/{id}/files/{file_id}` — returns a presigned GET URL valid for 15 minutes. Authenticated, tenant-scoped.

### Phase 6 — Submissions Admin UI

34. Build `(app)/pages/[pageId]/submissions/page.tsx` — the submissions table view within the Page Detail tabs.
35. Table columns: indicator dot (new/read/replied), submitter name/email, created_at, a snippet of the first long text field, a chevron to expand.
36. Expand-in-place behavior: click a row to reveal all fields, uploaded file thumbnails (clickable to download), action buttons (Reply, Mark Read, Archive, Download all).
37. Pagination with cursor-based approach for consistent performance as submission tables grow. Use `created_at < ?` cursors, not offsets.
38. Search bar above the table — free-text search across the `payload` JSONB. Use PostgreSQL's `@@` tsvector on expression index for performance: `CREATE INDEX ON submissions USING GIN (to_tsvector('english', payload::text))`.
39. Filter chips: All / New / Read / Replied / Archived.
40. Unread count badge on the Submissions tab — backed by a Redis counter per page, incremented on new submission, decremented on status change to read/replied/archived.

### Phase 7 — Replies

41. Implement `POST /api/v1/submissions/{id}/reply` — takes subject + body. Calls Resend to send. Records a SubmissionReply row with the Resend message ID for delivery tracking later.
42. Use the org's BrandKit to wrap the reply email in a branded template. If a logo is present, it appears in the header. Primary color is the CTA/header accent.
43. Reply draft auto-generation: before sending, Lucy can click "Generate draft" which calls the fast LLM with the submission context and produces a suggested reply. She edits before sending.
44. On reply, update submission status to `replied`.

### Phase 8 — CSV Export

45. Implement `GET /api/v1/pages/{page_id}/submissions/export?format=csv`. Use FastAPI's `StreamingResponse` to stream the CSV out in chunks.
46. CSV columns: submission_id, created_at, status, followed by each form field as its own column (dynamically from `form_schema`).
47. File columns contain the public filename (not the full URL — we don't want leaked URLs in spreadsheets).
48. Set `Content-Disposition: attachment; filename=submissions-{page_slug}-{date}.csv`.

### Phase 9 — Mark-As and Bulk Actions

49. Implement `PATCH /api/v1/submissions/{id}` — update status field.
50. Implement bulk action endpoint `POST /api/v1/pages/{page_id}/submissions/bulk` with `{submission_ids: [...], action: "mark_read" | "archive"}`.
51. UI: checkbox column in the submissions table, bulk action bar appears when any row is selected.

### Phase 10 — Worker Infrastructure

52. Configure the `worker` service's arq Redis queue. Define jobs: `run_automations`, `send_email`, `create_calendar_event`, `cleanup_revisions`, `drop_old_analytics_partitions`, `anonymize_ip_addresses`.
53. For this mission, stub the automation and email jobs — they log and return success. Mission 05 implements them. The important thing is the queue infrastructure works.
54. Idempotency: every job takes a `job_key` derived from the submission_id + step name. Redis `SET NX EX` enforces single-fire.
55. Retries: default retry with exponential backoff, max 3 attempts. Dead-letter queue for failed jobs — `GET /api/v1/admin/dlq` lists them.

### Phase 11 — Integration Tests

56. Test: publish → public page loads → public page renders form matching schema.
57. Test: submit via multipart (JS-disabled path) → submission stored, analytics event recorded, automation enqueued.
58. Test: submit via JSON (JS-enabled path with file upload) → file is accessible via presigned URL.
59. Test: admin views submissions, expands a row, sees correct data.
60. Test: reply sends an email (Resend mocked), submission status flips to replied.
61. Test: CSV export streams correctly for a page with 100+ submissions.
62. Test: cross-tenant — user of Org A cannot read submissions of Org B's page (404).
63. Test: rate limit triggers 429 after the 11th submission in a minute from the same IP.
64. Lighthouse test on a published page: score ≥ 95 on mobile performance.

### Phase 12 — Documentation

65. Update `docs/architecture/DATA_MODEL_OVERVIEW.md` with the `custom_domains` table and the submission lifecycle.
66. Write `docs/runbooks/PUBLISH_AND_HOST.md` describing how publishing, caching, and custom domains work in production.
67. Mission report.

---

## Acceptance Criteria

- A user can publish a page, visit its URL in an incognito window, see the live page, submit the form (with or without JavaScript), and the submission appears in their admin table within 5 seconds.
- File uploads work via presigned URLs; files are retrievable through the admin UI.
- CSV export downloads correctly.
- Replies send via Resend, status updates accordingly.
- Custom domain setup flow works end-to-end (DNS verification → cert issuance → routing).
- Partitioning is active on `submissions` and `analytics_events`; new monthly partitions auto-create.
- Lighthouse ≥ 95 on mobile for a form page.
- Public page works fully with JavaScript disabled.
- All lint / typecheck / test pass.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
