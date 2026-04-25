# GO-LIVE MISSION GL-01 — Comprehensive Engagement Analytics & Tracking

**Goal:** Make Forge know everything about how people use it — who visits which page, where they hesitate, where they abandon, which fields they skip, which sections they re-read, where they come from, what device they're on, which A/B variant they saw, which features are active for them — in enough detail that Brian can pull any slice of the data later and answer questions that haven't been asked yet. The existing `analytics_events` table from BI-01 is the foundation; this mission expands it into a full product-analytics platform with session stitching, funnel analysis, retention cohorts, a custom event API, and data export surfaces. After this mission, Forge has the telemetry of a Mixpanel or PostHog deployment, owned entirely by Digital Studio Labs.

**Branch:** `mission-gl-01-engagement-analytics`
**Prerequisites:** All Backend-Infra, Workflow, and Orchestration missions complete. The `analytics_events` partitioned table exists; the public-page tracker from W-01 fires basic `page_view` events. This mission extends both dramatically.
**Estimated scope:** Large. Event taxonomy expansion, client SDKs (in-app + public-page), session infrastructure, funnel engine, retention computation, export pipeline, real-time dashboard, per-user timelines.

---

## Experts Consulted On This Mission

- **Edward Tufte** — *Every metric earns its place. Are we collecting data we'll actually use, or vanity counters that clutter the warehouse?*
- **Don Norman** — *Analytics is about understanding the user's mental model failing the UI. Structure the data so causes are visible.*
- **Linus Torvalds** — *Can the write path sustain 1000 events/sec without dragging the app? The read path should be cheap for the common case.*
- **Mixpanel / PostHog / Amplitude patterns (2026)** — *Event + properties + user identity is the durable abstraction. Don't invent a new model.*

---

## How To Run This Mission

The architecture is **thin client, fat server** — the trackers are small and fire-and-forget, but the server-side can enrich, de-duplicate, session-stitch, and store at scale. The write path uses a dedicated `POST /p/{slug}/track` endpoint (public) and `POST /api/v1/analytics/track` (authenticated, for in-app events). Events queue into an async buffer, batch-insert into the partitioned `analytics_events` table, and never block the request response.

Read `docs/research/CLICKSTREAM.md` (compiled from Mission 00). The industry-standard funnel calculation is: step conversion rate, cumulative conversion, absolute counts, time between steps — all per the Parallel HQ funnel analysis guide. Retention is cohort-based: group users by signup day/week, track percentage returning on day N.

**The tracking is a commitment to the user.** If Brian later says "show me the drop-off on the pitch-deck review step for users who came from the Reddit campaign in March," the answer must exist. That means: capture everything reasonable, store it cheaply, expose it via a query surface.

Commit on milestones: expanded event taxonomy, public tracker SDK, in-app tracker, session stitching, funnel engine, retention computation, export endpoints, real-time dashboard, tests green.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Event Taxonomy (The Complete List)

1. Extend the `analytics_events.event_type` CHECK constraint to cover the full taxonomy. Write the migration carefully — dropping and re-adding a CHECK is fine but document the old-type-migration strategy in the migration header. The complete taxonomy:

    **Traffic events** (fired from public pages):
    - `page_view` — rendered
    - `page_leave` — beforeunload; captures duration on page
    - `section_dwell` — ≥3 seconds on a section (uses IntersectionObserver)
    - `section_exit` — fired when section leaves viewport; captures time-in-section
    - `scroll_depth` — fired at 25%, 50%, 75%, 100% thresholds (once each per session)
    - `click` — any tracked `data-forge-track` element
    - `cta_click` — specifically CTAs
    - `media_play` / `media_pause` / `media_complete` — for pages with embedded video
    - `outbound_link` — when a link to an external domain is clicked

    **Form events** (public form pages):
    - `form_view` — form component becomes visible
    - `form_start` — first field focus
    - `form_field_focus` — per-field, deduped per session
    - `form_field_touch` — user typed in the field (≥1 character)
    - `form_field_blur_valid` — blur with valid value
    - `form_field_blur_invalid` — blur with validation error (captures error code)
    - `form_field_abandon` — field was touched but never completed; fired on form abandon
    - `form_submit_attempt` — user clicked submit
    - `form_submit_success` — 2xx response from backend
    - `form_submit_error` — 4xx/5xx response (captures status)
    - `form_abandon` — left page without submitting after ≥5 sec on form

    **Booking-specific**:
    - `slot_picker_view`
    - `slot_picker_date_navigate` — user switched date in the picker
    - `slot_hover` — hovered a slot for ≥500ms (interest signal)
    - `slot_click` — picked a slot
    - `slot_hold_created` — backend hold succeeded
    - `slot_hold_expired` — hold expired without submit
    - `slot_released` — user backed out

    **Proposal-specific**:
    - `proposal_view` — proposal opened
    - `proposal_section_view` — each section entering viewport
    - `proposal_question_submit` — inline Q&A
    - `proposal_accept_click` — user clicked accept
    - `proposal_accept_success` — successfully signed
    - `proposal_decline`
    - `proposal_print` — user printed
    - `proposal_download`

    **Deck-specific**:
    - `deck_view` — scrolling mode
    - `slide_view` — scrolled into view
    - `slide_dwell` — ≥3 sec on slide
    - `present_start` — fullscreen/presenter mode engaged
    - `present_slide_view`
    - `present_slide_dwell`
    - `present_end`
    - `deck_export_click` (PDF / PPTX / Google Slides)

    **Studio & in-app events** (authenticated):
    - `studio_prompt_submit`
    - `studio_workflow_selected` — clarify chip interaction
    - `studio_section_edit_open`
    - `studio_section_edit_submit`
    - `studio_refine_chip_click`
    - `studio_provider_switch`
    - `studio_preview_viewport_change` — desktop/tablet/mobile preview
    - `studio_revision_open`
    - `studio_revision_restore`
    - `page_publish_click`
    - `page_publish_success`
    - `page_unpublish`
    - `page_delete`
    - `page_duplicate`
    - `dashboard_view`
    - `dashboard_filter_change`
    - `dashboard_search`
    - `page_detail_view`
    - `submissions_tab_open`
    - `submission_reply_send`
    - `template_use_click`
    - `integration_connect` (provider)
    - `settings_change` (setting name)

    **Lifecycle & business events** (authenticated):
    - `signup_start` (onboarding viewed)
    - `signup_complete`
    - `onboarding_step_complete` (step name)
    - `first_page_created`
    - `first_page_published`
    - `first_submission_received`
    - `first_proposal_accepted`
    - `plan_upgrade_click` (target plan)
    - `plan_upgrade_success`
    - `plan_downgrade`
    - `plan_cancel`
    - `billing_portal_open`
    - `trial_ended`
    - `invitation_sent`
    - `invitation_accepted`

    **Quota & error events**:
    - `quota_warning_view` (metric, percent)
    - `quota_exceeded_view`
    - `error_boundary_caught` (component, error code)
    - `api_error_surfaced` (endpoint, status, code)

2. For the full taxonomy, maintain an authoritative registry in `apps/api/app/services/analytics/events.py`:
    ```python
    @dataclass(frozen=True)
    class EventDefinition:
        name: str
        category: str  # 'traffic' | 'form' | 'booking' | 'proposal' | 'deck' | 'studio' | 'lifecycle' | 'error'
        scope: Literal['public', 'authenticated', 'both']
        required_properties: list[str]
        optional_properties: list[str]
        description: str
    
    EVENTS: dict[str, EventDefinition] = {
        "page_view": EventDefinition(
            name="page_view",
            category="traffic",
            scope="public",
            required_properties=["page_id"],
            optional_properties=["referrer", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"],
            description="Fires on initial page render for a published Forge page.",
        ),
        # ... exhaustive ...
    }
    ```
3. Every write to `analytics_events` validates `event_type` against the registry and validates `metadata` contains the required properties. Unknown events are rejected at the API layer with a clear error — prevents typo-propagation. New events require a migration to add them (deliberate friction against analytics bloat).
4. Write `docs/architecture/EVENT_TAXONOMY.md` — the complete catalog with descriptions, example payloads, which surface emits each.

### Phase 2 — Expanded Events Table Schema

5. Extend `analytics_events` with additional first-class columns (migration). These are fields we want indexed and queryable without JSONB unwrapping:
    ```sql
    ALTER TABLE analytics_events
      ADD COLUMN user_id UUID REFERENCES users(id),           -- nullable: public visitors have no user
      ADD COLUMN session_id TEXT,                             -- already exists but make NOT NULL going forward
      ADD COLUMN event_source TEXT CHECK (event_source IN ('public_page','web_app','mobile_app','server','webhook')),
      ADD COLUMN workflow TEXT,                               -- 'contact_form' | 'proposal' | 'pitch_deck' | etc.
      ADD COLUMN surface TEXT,                                -- 'studio' | 'dashboard' | 'public_page' | etc.
      ADD COLUMN referrer_domain TEXT,
      ADD COLUMN utm_source TEXT,
      ADD COLUMN utm_medium TEXT,
      ADD COLUMN utm_campaign TEXT,
      ADD COLUMN utm_content TEXT,
      ADD COLUMN utm_term TEXT,
      ADD COLUMN browser TEXT,
      ADD COLUMN os TEXT,
      ADD COLUMN device_model TEXT,
      ADD COLUMN viewport_width INT,
      ADD COLUMN viewport_height INT,
      ADD COLUMN locale TEXT,
      ADD COLUMN timezone TEXT,
      ADD COLUMN experiment_arm JSONB DEFAULT '{}'::jsonb,   -- {experiment_key: variant}
      ADD COLUMN feature_flags JSONB DEFAULT '{}'::jsonb;    -- snapshot of flags active when event fired
    ```
6. Add partial indexes for the high-frequency query shapes:
    ```sql
    CREATE INDEX idx_events_org_user_created ON analytics_events(organization_id, user_id, created_at DESC) WHERE user_id IS NOT NULL;
    CREATE INDEX idx_events_org_session ON analytics_events(organization_id, session_id, created_at);
    CREATE INDEX idx_events_org_page_event_created ON analytics_events(organization_id, page_id, event_type, created_at DESC);
    CREATE INDEX idx_events_utm ON analytics_events(organization_id, utm_campaign, created_at DESC) WHERE utm_campaign IS NOT NULL;
    CREATE INDEX idx_events_workflow ON analytics_events(organization_id, workflow, created_at DESC) WHERE workflow IS NOT NULL;
    ```
7. pg_partman retention: align with org settings (`data_retention.analytics_retention_days` from BI-04). The partman cron drops partitions older than the org's retention, per-tenant. Since partitions are global (not per-tenant), the "drop" is soft — we keep partitions around as long as the LONGEST retention across active orgs, and for orgs at the default 90 days we purge rows via a scheduled `DELETE` in partitions older than 90 days. The deletes are cheap because the RLS policies and partitioning make them targeted.
8. Separately, create a `analytics_events_archive` cold-storage process: on the 1st of each month, export partitions older than 13 months to S3/R2 as compressed Parquet files named `events/{org_id}/YYYY-MM.parquet`. Gives the user long-term history without hot-storage cost. The export is a worker job `analytics_archive_monthly` scheduled via arq cron.

### Phase 3 — Session & Visitor Identity

9. Create `app/services/analytics/identity.py` with visitor identity logic:
    - **Visitor ID (`visitor_id`)**: a stable anonymous ID stored in a first-party cookie `forge_v` with 1-year expiry. Generated server-side on first request using `secrets.token_urlsafe(16)`. Cookie is SameSite=Lax, Secure in prod. If blocked (user agent has no cookie), fall back to a request-scoped ID so the event isn't lost but session stitching is degraded.
    - **Session ID (`session_id`)**: a session identifier stored in a session cookie `forge_s`. Generated fresh if the cookie is absent or if the last event on the prior session was > 30 minutes ago. 30-minute inactivity → new session (industry standard).
    - **User ID (`user_id`)**: from the auth cookie for authenticated surfaces; NULL for public visitors. **Identity merging**: when a visitor signs up, the signup endpoint emits an `identity_merge` event linking `visitor_id → user_id`. Persist this in a small `identity_merges` table so historical events for that visitor can be attributed to the user post-signup.
        ```sql
        CREATE TABLE identity_merges (
          visitor_id TEXT NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (visitor_id, user_id)
        );
        CREATE INDEX idx_identity_merges_user ON identity_merges(user_id);
        ```
    - The query layer (Phase 6) joins `analytics_events.visitor_id` through `identity_merges` to attribute pre-signup events to the signed-up user.
10. **Cross-device linking**: when a user signs in from a new device, we emit an `identity_merge` linking the new device's visitor_id to their user_id. Over time a single user can be associated with many visitor_ids — that's fine; the merge table supports it.
11. **GDPR & privacy**:
    - Every public page's footer mentions basic analytics; we don't drop cookies for EU visitors before consent if the org has enabled the consent banner (Phase 10).
    - The `DELETE /api/v1/auth/me` flow (BI-04) enqueues a PII scrub that sets `user_id = NULL` and hashes `submitter_email` on any events belonging to that user in `analytics_events` and `submissions` after the 30-day grace.

### Phase 4 — Client-Side Trackers (Two Flavors)

12. **Public-page tracker** (`apps/web/public/forge-track.js`, served as a static asset — NOT bundled into the Next app). ~5KB gzipped. Inlined into every published Forge page by the backend renderer. Responsibilities:
    - Manage `forge_v` and `forge_s` cookies client-side.
    - Queue events in memory; flush every 2 seconds OR when the queue exceeds 10 events OR on `beforeunload` via `navigator.sendBeacon()`.
    - Automatic events: `page_view` on load, `page_leave` on unload, scroll-depth thresholds, section dwell via IntersectionObserver for all `[data-forge-section]`, CTA clicks for `[data-forge-track-cta]`.
    - Manual event API: `window.forge.track(eventType, properties)` for custom instrumentation (used by the form submit handler, slot picker, proposal accept flow, etc).
    - Respects Do-Not-Track and cookie consent (if consent banner was enabled by the org and user declined).
    - Offline-resilient: if the `/track` endpoint fails, retry on the next flush; drop events older than 1 hour.
13. **In-app tracker** (part of the Next.js app bundle). Implemented in `apps/web/src/lib/analytics/tracker.ts`:
    - Exposes a React hook `useAnalytics()` returning `{track, identify, page}`.
    - Auto-tracks route changes (`page_view` with the Next.js route).
    - Auto-tracks error boundary catches.
    - Integrates with the existing auth context so every event has `user_id` and `organization_id` populated automatically.
    - Queues and flushes the same way.
14. **Zero-trust on the client**: the backend NEVER trusts the client's claim about `user_id` or `organization_id` on the public `/track` endpoint. Instead, the backend resolves those from the page's metadata and the request's auth (if any). The client passes `page_slug` only; the backend determines the page and org.

### Phase 5 — Ingestion Pipeline

15. `POST /p/{slug}/track` (public) — accepts up to 20 events per request. For each event:
    - Resolve page + org from the slug.
    - Enrich with server-side fields: IP-derived country (MaxMind GeoLite2 offline database; fall back to `Accept-Language` hints if blocked), server-parsed User-Agent (`user-agents` package), `received_at` timestamp.
    - Validate against the event registry.
    - Push to an in-process asyncio `Queue`. A background consumer task batches and writes to Postgres.
16. `POST /api/v1/analytics/track` (authenticated) — same pattern for authenticated events. Auth middleware already populated user + org.
17. **Batch writes**: the consumer buffers up to 500 events or 1 second, whichever comes first. Uses `COPY FROM STDIN` via `asyncpg`'s `copy_records_to_table` for efficient bulk insert. Single-digit ms per batch.
18. **Backpressure**: if the queue grows beyond 5,000 events, we drop the oldest events and emit a `analytics.backpressure_drop` metric. Log an alert. This is the fail-open behavior — we prefer occasional dropped events under load to taking down the app.
19. **Idempotency**: the tracker assigns a client-side UUID `client_event_id` to every event. The server stores this in a Redis set `events:dedupe:{date}` with 25-hour TTL. Duplicate client_event_ids within that window are skipped. Defends against retries after a partial flush failure.
20. **Rate limits**: per-IP, `60 req/min` on the public endpoint (batch size up to 20 = 1200 events/min per IP). Per-user `600 req/min` on the authenticated endpoint. Hit limit → 429 + Retry-After.

### Phase 6 — Funnel Engine

21. Funnels are a core user-facing feature. Create `app/services/analytics/funnels.py` implementing a small DSL:
    ```python
    @dataclass
    class FunnelStep:
        name: str                                # "Form viewed"
        event_type: str                          # "form_view"
        filter: dict | None = None               # optional property filter: {"field_id": "email"}
        
    @dataclass
    class FunnelDefinition:
        id: str
        name: str
        steps: list[FunnelStep]
        conversion_window: timedelta = timedelta(hours=24)
        exact_order: bool = True                 # must traverse steps in order
        unique_on: Literal['visitor', 'user', 'session'] = 'session'
    ```
22. Pre-defined funnels per workflow (seeded in a new `funnels` table scoped per-org):
    - **Contact form funnel** (default for form pages): page_view → form_view → form_start → form_submit_attempt → form_submit_success.
    - **Booking funnel**: page_view → slot_picker_view → slot_click → slot_hold_created → form_submit_success.
    - **Proposal funnel**: page_view → proposal_section_view (cover) → proposal_section_view (pricing) → proposal_section_view (terms) → proposal_accept_click → proposal_accept_success.
    - **Pitch deck funnel**: page_view → slide_view (slide 1) → slide_view (slide N/2) → slide_view (last slide).
    - **Onboarding funnel** (org-wide): signup_complete → onboarding_step_complete (workflow_picked) → first_page_created → first_page_published → first_submission_received.
23. Funnel computation query:
    ```python
    async def compute_funnel(
        funnel: FunnelDefinition,
        *,
        org_id: UUID,
        date_from: datetime,
        date_to: datetime,
        segment: SegmentFilter | None = None,
    ) -> FunnelResult:
        """Returns per-step counts, drop-off, time-to-convert percentiles."""
    ```
    Implementation uses SQL window functions over `analytics_events`. Key idea: for each visitor/user/session entering step 1, find the earliest subsequent event matching step 2, 3, etc., within `conversion_window`. Group by step, count distinct entrants.
24. The query is expensive on large event volumes. Cache funnel results in Redis with 5-minute TTL keyed by `funnel:{funnel_id}:{segment_hash}:{date_from}:{date_to}`. Recompute on cache miss.
25. Expose:
    - `GET /api/v1/analytics/funnels` — list org's funnels (seeded + custom).
    - `POST /api/v1/analytics/funnels` — create custom funnel.
    - `PATCH /api/v1/analytics/funnels/{id}` — update.
    - `DELETE /api/v1/analytics/funnels/{id}` — delete.
    - `GET /api/v1/analytics/funnels/{id}/compute?date_from&date_to&segment=` — run and return result.

### Phase 7 — Drop-off Analysis (Per Step, Per Field)

26. Funnel results include explicit drop-off data:
    ```python
    class FunnelStepResult(BaseModel):
        step: FunnelStep
        entrants: int                       # how many reached this step
        completers: int                     # how many moved to the next step
        drop_off_count: int                 # entrants - completers
        drop_off_rate: float                # 0-1
        step_conversion_rate: float         # completers / entrants
        cumulative_conversion: float        # completers / funnel entrants
        median_time_to_next_step_seconds: int | None
        p90_time_to_next_step_seconds: int | None
    ```
27. **Field-level drop-off** (for form funnels): in the funnel result, include a `field_drop_off` breakdown sourced from `form_field_focus` + `form_field_abandon` events. Shows which specific field a user quit on — the most actionable analytics for a form creator. Stored as `dict[field_id, count]`.
28. **Last-seen analysis**: for visitors who drop off, capture the last event they fired, their last-seen URL, and time on page before abandon. Stored per-funnel-result as an aggregate histogram of last-seen events.

### Phase 8 — Retention Cohorts

29. Retention is the N-day-return metric. Compute per-workflow per-org:
    ```python
    async def compute_retention(
        *,
        org_id: UUID,
        cohort_event: str,             # e.g., "signup_complete" for signup cohorts, "first_page_created"
        return_event: str,             # e.g., "page_publish_success"
        cohort_size: Literal['day', 'week'] = 'week',
        max_periods: int = 12,
    ) -> RetentionGrid:
        """Grid of [cohort_start_date][period_index] = return_rate (0-1)."""
    ```
30. Retention computation is a materialized view refreshed nightly:
    ```sql
    CREATE MATERIALIZED VIEW retention_signup_weekly AS
    WITH cohorts AS (
      SELECT
        organization_id,
        user_id,
        date_trunc('week', MIN(created_at)) AS cohort_week
      FROM analytics_events
      WHERE event_type = 'signup_complete'
      GROUP BY organization_id, user_id
    ),
    returns AS (
      SELECT DISTINCT
        c.organization_id,
        c.cohort_week,
        c.user_id,
        EXTRACT(WEEK FROM e.created_at - c.cohort_week)::INT AS period
      FROM cohorts c
      JOIN analytics_events e USING (organization_id, user_id)
      WHERE e.event_type IN ('page_created','page_publish_success','submission_reply_send')
    )
    SELECT
      organization_id,
      cohort_week,
      period,
      COUNT(DISTINCT user_id) AS returning_users,
      (SELECT COUNT(*) FROM cohorts c2 WHERE c2.organization_id = r.organization_id AND c2.cohort_week = r.cohort_week) AS cohort_size
    FROM returns r
    GROUP BY organization_id, cohort_week, period;
    ```
31. Refresh nightly via arq cron `refresh_retention_views`. Users never wait on recompute.
32. Expose `GET /api/v1/analytics/retention?cohort_event=&return_event=&cohort_size=weekly` returning the grid.

### Phase 9 — Real-Time Engagement Dashboard

33. Build `(app)/analytics/engagement/page.tsx` — a dedicated surface for deep engagement analytics. Tabs:
    - **Overview**: KPIs at the top (30-day DAU, new visitors, total events), funnel-of-the-month, weekly retention curve, top pages by engagement.
    - **Funnels**: funnel library + visual funnel renderer with waterfall chart showing drop-off at each step. Click any step to see the field-level breakdown.
    - **Retention**: cohort grid as a triangle heatmap (weeks as rows, periods as columns, color intensity = return rate). Configurable cohort event / return event from a small toolbar.
    - **User timelines**: searchable list of users; click a user to see their full event chronology (scrollable timeline with each event as a bubble). Great for support and qualitative research.
    - **Segments**: define reusable segments (e.g., "Users from Reddit campaign"). Apply to funnels and retention views.
    - **Custom queries**: a bounded SQL-like query builder (filters only, no SELECT) that outputs event lists or counts.
34. Charts use Recharts + Tailwind. All charts exportable as PNG via `html-to-image`.
35. Funnel visualizations always show both **absolute counts** and **conversion rates**. Hide neither; they tell different stories (Tufte's data-ink rule — the widths of funnel steps are information).
36. The live "top pages right now" strip (bottom of Overview) uses a 60-second polling endpoint `GET /api/v1/analytics/realtime` that queries the last 5 minutes of events, grouped by page. Shows currently-active visitors per page.

### Phase 10 — Per-User Timeline & Behavior Search

37. User timeline view (accessible from the Analytics dashboard and from the Team page):
    - Searchable by email, name, or user ID.
    - Shows all events for that user, sorted newest-first, with contextual icons per event category.
    - Click any event to expand and see its full properties payload.
    - "Replay session" button filters to one session and shows events in order with inter-event timing.
38. `GET /api/v1/analytics/users/{user_id}/timeline?cursor=&limit=` — paginated. RLS-protected (user must be in the requesting org).
39. For the public-page side, similar surface for VISITORS: `GET /api/v1/analytics/visitors/{visitor_id}/timeline` — the creator can see the full journey of a specific anonymous visitor who submitted their form. Useful for sales context.
40. Timeline search honors identity merges: looking up a user also returns events from visitor_ids merged into them.

### Phase 11 — Custom Events API

41. Users can define custom events specific to their business. Create `POST /api/v1/analytics/custom-events` with payload `{name, description, category, required_properties, optional_properties}`. Stored in a new `custom_event_definitions` table scoped per-org.
42. Custom event names are namespaced: `custom.{org_slug}.{event_name}` to prevent collision with system events. The validator in Phase 5 allows them through based on the org's registered custom events.
43. Custom events show up in:
    - Timeline views.
    - Funnel builder (as selectable events).
    - Segment definition.
44. Maximum 50 custom events per org on Starter, 200 on Pro, unlimited on Enterprise.

### Phase 12 — Segmentation Engine

45. Segments are reusable filter definitions. Schema:
    ```sql
    CREATE TABLE segments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      filters JSONB NOT NULL,                -- AST-like structure of conditions
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
    RLS enabled.
46. Filter AST supports:
    - Event filters: "user performed `form_submit_success`"; "user has NOT performed `plan_upgrade_click`".
    - Property filters: "utm_campaign = 'reddit_march'"; "device_type = 'mobile'"; "country_code IN ('US', 'CA')".
    - Time filters: "in the last 7 days"; "between date X and Y".
    - Combination: AND / OR / NOT.
47. Apply a segment to any funnel, retention grid, or event query — scopes the computation to users matching the segment.
48. Pre-seeded segments per org: "All users", "Mobile visitors", "Converted last 30 days", "High-intent (performed proposal_section_view on pricing)". Users can clone and customize.

### Phase 13 — Data Export Surface (Brian's Ask)

49. Raw event export:
    - `POST /api/v1/analytics/exports` — payload `{date_from, date_to, event_types?, segment_id?, format: 'csv'|'jsonl'|'parquet'}`. Queues an `analytics_export` worker job.
    - Worker runs a chunked SELECT against `analytics_events` (scoped by org via RLS), streams to an S3 object, emails the requestor a signed download link.
    - Limit: one concurrent export per org, max date range of 12 months per export.
50. Pre-aggregated rollup exports — more Brian-friendly than raw events. `GET /api/v1/analytics/rollups/daily?date_from=&date_to=&dimension=page|workflow|utm_campaign|country&metrics=visitors,sessions,conversions` — returns CSV directly.
51. BI tool connector — an optional Postgres read-only user per org that can connect Metabase/Superset/Sigma directly. Gated by a Pro+ setting "Enable BI connector". Credentials rotate monthly.
52. Webhook delivery for high-value events (e.g., `first_submission_received`, `proposal_accept_success`) — reuse the outbound webhooks from BI-04, just expose analytics event subscriptions as a new event kind.

### Phase 14 — Feature-Flag Integration

53. Every analytics event stamps the currently-active feature flags for the user+org at event time. This lets us analyze feature-flag impact on behavior — the rollback signal.
54. A/B experiment support:
    - `experiments` table:
        ```sql
        CREATE TABLE experiments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id),   -- NULL for platform-level experiments
          key TEXT NOT NULL,
          description TEXT,
          variants JSONB NOT NULL,             -- [{key: 'control', weight: 50}, {key: 'teal_cta', weight: 50}]
          status TEXT CHECK (status IN ('draft','running','paused','completed','archived')),
          started_at TIMESTAMPTZ,
          ended_at TIMESTAMPTZ,
          winner_variant TEXT,
          UNIQUE (organization_id, key)
        );
        ```
    - Variant assignment: hash(visitor_id + experiment_key) → consistent bucketing.
    - Events fired while an experiment is active carry `experiment_arm` = `{experiment_key: variant_key}`.
55. Analysis surface at `(app)/analytics/experiments` — list of experiments with per-variant conversion rates on a chosen goal event, statistical significance indicator (chi-square test, p-value, with a "significance threshold 95%" banner).

### Phase 15 — Tests

56. Unit tests for the event registry: every event has a valid category + scope; unknown event names rejected.
57. Tracker tests (Playwright): load a published page, assert expected events fire in order, assert flush on unload via sendBeacon.
58. Session stitching test: make several events over 45 minutes, verify a new session starts after the 30-minute gap.
59. Identity merge test: track as visitor, sign up, track as user; query the user's timeline, verify pre-signup events appear.
60. Funnel engine test: seed events for a known funnel, run compute, assert counts and conversion rates match hand-computed expectations.
61. Retention materialized-view refresh test.
62. Rate limit test: exceed 60/min on public track, get 429.
63. Ingestion load test: pump 5000 events/sec at the `/track` endpoint for 60 seconds, verify no drops beyond backpressure threshold, no lost events from a normal load of 200 events/sec, no read-query slowdown on the dashboard during the burst.
64. Export correctness test: export a known date range, verify every event in the output matches the DB.
65. GDPR scrub test: delete a user, verify their PII is hashed/nulled in analytics_events within the grace period.

### Phase 16 — Documentation

66. `docs/architecture/ANALYTICS.md` — the full architecture: event flow, ingestion, session stitching, identity merge, funnel engine, retention, export.
67. `docs/runbooks/ANALYTICS_DEBUGGING.md` — "events aren't showing up" playbook, how to inspect the ingestion queue, how to re-ingest from raw logs if ever needed.
68. `docs/user/ANALYTICS_GUIDE.md` — user-facing guide: how to read funnels, how to build custom segments, how to export, FAQ on what's tracked and why.
69. Mission report.

---

## Acceptance Criteria

- Complete event taxonomy covers every tracked behavior across public pages, Studio, Dashboard, and all workflows.
- Both client trackers fire correctly with zero console errors, queue + batch responsibly, survive offline/unload.
- Ingestion scales to 5000+ events/sec with bounded backpressure.
- Session stitching correctly groups events into sessions with 30-min inactivity threshold.
- Identity merge surfaces pre-signup events on user timelines.
- Funnel engine computes step conversion, cumulative conversion, drop-off rates, and time-to-next-step percentiles correctly.
- Field-level drop-off is captured and displayed for form funnels.
- Retention cohorts refresh nightly and render as a heatmap grid.
- Custom events API lets orgs define their own events; they integrate into funnels and segments.
- Segmentation engine supports event, property, and time filters with AND/OR/NOT composition.
- Data export produces raw CSV/JSONL/Parquet and pre-aggregated rollups.
- Feature flags and A/B experiments are stamped on events; experiment analysis surface works.
- GDPR scrub correctly anonymizes analytics events for deleted users.
- All tests pass; coverage ≥ 85% on analytics services.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
