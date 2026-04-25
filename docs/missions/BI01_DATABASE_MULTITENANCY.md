# BACKEND-INFRA MISSION BI-01 — Database Schema & Multi-Tenancy Foundation

**Goal:** Build the tenant-safe, performance-grade PostgreSQL foundation for Forge. Every tenant-scoped table carries `organization_id`, has Row-Level Security enforced by the database, and is indexed for the queries it will actually receive. Every migration is reversible. Every seeder is idempotent. After this mission, a developer on the team cannot accidentally read another tenant's data — the database itself refuses the query.

**Branch:** `mission-bi-01-db-multitenancy`
**Prerequisites:** Backend Mission 01 (scaffold) complete — FastAPI app running, Alembic initialized, Postgres 16 reachable via docker-compose.
**Estimated scope:** Medium-large. 20+ tables, RLS policies on ~15 of them, partitioning on 2, and a non-superuser DB role used in production.

---

## Experts Consulted On This Mission

- **Linus Torvalds** — *Will this scale under real-world use? Does complexity emerge from simplicity?*
- **Ken Thompson / Dennis Ritchie** — *Does each table do one thing well? Are we solving the right level of the problem?*
- **Don Norman** — *Does the data model match how humans think about the product?*

---

## How To Run This Mission

The discipline here is **defense-in-depth.** Application-level filtering (`WHERE organization_id = :active_org`) is still required. But RLS is the ultimate guardrail: if any query ever leaks through application code (a forgotten filter, a raw SQL query, an LLM-generated SQL from a future feature), the database rejects the rows. This is not optional, and it is not paranoia — it is what makes Forge safe for paying customers.

Read `docs/external/backend/postgres-rls.md` before touching schema. The AWS Prescriptive Guidance on "managed PostgreSQL for multi-tenant SaaS" and Crunchy Data's "Row Level Security for Tenants" are the two authoritative references; summaries should live in that docs folder from Mission 00.

Commit on milestones: initial migration applied, RLS enabled, partitioning added, tests green, seed script working.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Database Roles & Session Variables

1. Create a migration that establishes three Postgres roles:
    - `forge_owner` — owns all tables; used only for migrations. Has `BYPASSRLS` so Alembic can run without context. Never used by the application.
    - `forge_app` — the role the FastAPI app connects as. **Does NOT have `BYPASSRLS`.** This is the role RLS policies protect against. Has `SELECT, INSERT, UPDATE, DELETE` on application tables.
    - `forge_admin` — optional admin role with `BYPASSRLS` for internal tooling (e.g., aggregate analytics across orgs). Never used by normal request paths.
2. Document in `docs/runbooks/DATABASE_ROLES.md`: which role is used where, how to connect as each, how to rotate passwords, and the critical warning that `forge_owner` must never be used for app requests.
3. Set up a session variable convention:
    - `app.current_org_id` — the active organization UUID for this request.
    - `app.current_user_id` — the authenticated user UUID.
    - `app.is_admin` — `'t'` or `'f'` (text because `current_setting` returns text).
    These are set per-request by the tenant middleware (built in BI-02).
4. Create two helper functions in a dedicated migration:
    ```sql
    CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID AS $$
      SELECT NULLIF(current_setting('app.current_org_id', TRUE), '')::UUID;
    $$ LANGUAGE SQL STABLE;

    CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
      SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
    $$ LANGUAGE SQL STABLE;
    ```
    `STABLE` lets Postgres optimize — the value doesn't change within a statement.

### Phase 2 — Core Schema: Identity & Tenancy

5. Create the `users` table — platform identity, NOT tenant-scoped:
    ```sql
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email CITEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      locale TEXT NOT NULL DEFAULT 'en-US',
      email_verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX idx_users_email ON users(LOWER(email));
    ```
    `users` is deliberately NOT under RLS — users can belong to multiple orgs, and cross-org user identity resolution (for "accept invitation" flows) needs to read the row regardless of active tenant.
6. Create the `organizations` table — the tenant root:
    ```sql
    CREATE TABLE organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,62}[a-z0-9]$'),
      plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT UNIQUE,
      trial_ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
    CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
    ```
7. Create the `memberships` table — the user⇄org join with role:
    ```sql
    CREATE TABLE memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner','editor','viewer')),
      invited_by UUID REFERENCES users(id),
      invited_at TIMESTAMPTZ,
      accepted_at TIMESTAMPTZ,
      last_active_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id, user_id)
    );
    CREATE INDEX idx_memberships_user ON memberships(user_id);
    CREATE INDEX idx_memberships_org ON memberships(organization_id);
    ```
8. Create `invitations` — pending invites:
    ```sql
    CREATE TABLE invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email CITEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner','editor','viewer')),
      invited_by UUID NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id, email) WHERE accepted_at IS NULL
    );
    ```
9. Create `brand_kits` (1:1 with org for MVP; could be 1:N later):
    ```sql
    CREATE TABLE brand_kits (
      organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
      logo_url TEXT,
      logo_storage_key TEXT,
      primary_color TEXT CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$'),
      secondary_color TEXT CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9a-fA-F]{6}$'),
      display_font TEXT DEFAULT 'Cormorant Garamond',
      body_font TEXT DEFAULT 'Manrope',
      voice_note TEXT CHECK (char_length(voice_note) <= 500),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```

### Phase 3 — Core Schema: Product Tables

10. Create `pages`:
    ```sql
    CREATE TABLE pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      page_type TEXT NOT NULL CHECK (page_type IN (
        'contact_form','booking_form','event_rsvp','menu',
        'landing','proposal','pitch_deck','gallery','promotion'
      )),
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','archived')),
      intent_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      brand_snapshot JSONB,
      current_revision_id UUID,
      published_revision_id UUID,
      custom_domain TEXT,
      seo_title TEXT,
      seo_description TEXT,
      og_image_url TEXT,
      view_count BIGINT NOT NULL DEFAULT 0,
      submission_count BIGINT NOT NULL DEFAULT 0,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ,
      archived_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ,
      UNIQUE(organization_id, slug) WHERE deleted_at IS NULL
    );
    CREATE INDEX idx_pages_org_status ON pages(organization_id, status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_pages_org_updated ON pages(organization_id, updated_at DESC) WHERE deleted_at IS NULL;
    CREATE INDEX idx_pages_published ON pages(organization_id, published_at DESC) WHERE status='live' AND deleted_at IS NULL;
    CREATE INDEX idx_pages_type ON pages(organization_id, page_type) WHERE deleted_at IS NULL;
    ```
11. Create `page_revisions`:
    ```sql
    CREATE TABLE page_revisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      version_number INT NOT NULL,
      html TEXT NOT NULL,
      form_schema JSONB,
      intent_snapshot JSONB NOT NULL,
      brand_snapshot JSONB NOT NULL,
      edit_type TEXT NOT NULL CHECK (edit_type IN (
        'initial','full_refine','section_edit','template_applied','manual_edit'
      )),
      edit_metadata JSONB DEFAULT '{}'::jsonb,
      ai_provider TEXT,
      ai_model TEXT,
      tokens_input INT,
      tokens_output INT,
      cost_cents INT,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(page_id, version_number)
    );
    CREATE INDEX idx_page_revisions_page_version ON page_revisions(page_id, version_number DESC);
    ```
12. Create `templates` (global — NOT tenant-scoped; curated by Digital Studio Labs):
    ```sql
    CREATE TABLE templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      page_type TEXT NOT NULL,
      preview_image_url TEXT,
      preview_page_slug TEXT UNIQUE,
      html TEXT NOT NULL,
      form_schema JSONB,
      intent_json JSONB NOT NULL,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INT NOT NULL DEFAULT 0,
      use_count BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_templates_category_published ON templates(category, is_published, sort_order);
    ```

### Phase 4 — Submissions (Partitioned by Month)

13. Create `submissions` as a **partitioned table** by `created_at` (monthly):
    ```sql
    CREATE TABLE submissions (
      id UUID DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id),
      page_id UUID NOT NULL REFERENCES pages(id),
      data JSONB NOT NULL,
      files JSONB NOT NULL DEFAULT '[]'::jsonb,
      submitter_ip INET,
      submitter_user_agent TEXT,
      submitter_email CITEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','replied','archived','spam')),
      read_at TIMESTAMPTZ,
      replied_at TIMESTAMPTZ,
      archived_at TIMESTAMPTZ,
      reply_draft TEXT,
      calendar_event_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);

    CREATE INDEX idx_submissions_org_page_created ON submissions(organization_id, page_id, created_at DESC);
    CREATE INDEX idx_submissions_org_status ON submissions(organization_id, status) WHERE status IN ('new','read');
    CREATE INDEX idx_submissions_email ON submissions(organization_id, submitter_email) WHERE submitter_email IS NOT NULL;
    ```
    Note: primary key includes `created_at` because partitioned table PKs must include the partition key.
14. Install `pg_partman` extension (if not already):
    ```sql
    CREATE EXTENSION IF NOT EXISTS pg_partman;
    SELECT partman.create_parent(
      p_parent_table => 'public.submissions',
      p_control => 'created_at',
      p_type => 'range',
      p_interval => '1 month',
      p_premake => 3  -- pre-create 3 months of future partitions
    );
    ```
15. Set up a scheduled maintenance job (will run via arq cron from BI-04) that calls `partman.run_maintenance()` daily at 02:00 UTC to create new partitions and drop partitions older than the retention window per plan (default 90 days, Pro 180, Enterprise 365).

### Phase 5 — Analytics Events (Partitioned, High-Volume)

16. Create `analytics_events`:
    ```sql
    CREATE TABLE analytics_events (
      id BIGSERIAL,
      organization_id UUID NOT NULL REFERENCES organizations(id),
      page_id UUID NOT NULL REFERENCES pages(id),
      event_type TEXT NOT NULL CHECK (event_type IN (
        'page_view','section_dwell','cta_click',
        'form_start','form_field_touch','form_abandon','form_submit',
        'proposal_accept','proposal_decline'
      )),
      visitor_id TEXT NOT NULL,
      session_id TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      referrer TEXT,
      user_agent TEXT,
      device_type TEXT CHECK (device_type IN ('desktop','mobile','tablet','bot')),
      country_code CHAR(2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);

    CREATE INDEX idx_events_org_page_type_created ON analytics_events(organization_id, page_id, event_type, created_at DESC);
    CREATE INDEX idx_events_visitor ON analytics_events(organization_id, visitor_id, created_at DESC);
    ```
17. Partition identically via pg_partman with monthly intervals, 4-month premake.
18. NO foreign key on `visitor_id` — visitors aren't users.

### Phase 6 — Automations & Integrations

19. Create `automation_configs` (1:1 per page):
    ```sql
    CREATE TABLE automation_configs (
      page_id UUID PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      notify_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      notify_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      confirm_submitter_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      confirm_subject TEXT,
      confirm_body TEXT,
      calendar_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      calendar_integration_id UUID,
      calendar_duration_minutes INT DEFAULT 60,
      calendar_send_invite BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
20. Create `integrations` (OAuth connections per org):
    ```sql
    CREATE TABLE integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('google_calendar','google_drive','slack','zapier')),
      connected_user_id UUID NOT NULL REFERENCES users(id),
      external_account_email TEXT,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      token_expires_at TIMESTAMPTZ,
      scope TEXT,
      external_account_id TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked','error')),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id, provider, connected_user_id)
    );
    CREATE INDEX idx_integrations_org ON integrations(organization_id);
    ```
21. Create `availability_calendars` for the "import ICS for scheduling context" feature:
    ```sql
    CREATE TABLE availability_calendars (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      owner_user_id UUID NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN ('ics_upload','ics_url','google_calendar')),
      source_ref TEXT,  -- storage key, URL, or integration_id
      timezone TEXT NOT NULL DEFAULT 'UTC',
      business_hours JSONB NOT NULL DEFAULT '{}'::jsonb,  -- per-weekday ranges
      buffer_before_minutes INT NOT NULL DEFAULT 0,
      buffer_after_minutes INT NOT NULL DEFAULT 0,
      min_notice_minutes INT NOT NULL DEFAULT 1440,  -- 24 hours default
      max_advance_days INT NOT NULL DEFAULT 60,
      slot_duration_minutes INT NOT NULL DEFAULT 30,
      last_synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
22. Create `calendar_busy_blocks` — parsed busy periods from the imported calendar:
    ```sql
    CREATE TABLE calendar_busy_blocks (
      id BIGSERIAL PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      calendar_id UUID NOT NULL REFERENCES availability_calendars(id) ON DELETE CASCADE,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      source_uid TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_busy_blocks_calendar_time ON calendar_busy_blocks(calendar_id, starts_at, ends_at);
    ```

### Phase 7 — Automation Jobs & Audit

23. Create `automation_jobs`:
    ```sql
    CREATE TABLE automation_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      submission_id UUID,
      page_id UUID REFERENCES pages(id),
      job_type TEXT NOT NULL CHECK (job_type IN ('email_notify','email_confirm','calendar_create','email_reply')),
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','dead')),
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      last_error TEXT,
      scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_jobs_status_scheduled ON automation_jobs(status, scheduled_at) WHERE status IN ('pending','failed');
    CREATE INDEX idx_jobs_org_created ON automation_jobs(organization_id, created_at DESC);
    ```
24. Create `audit_log` — one row per significant mutation:
    ```sql
    CREATE TABLE audit_log (
      id BIGSERIAL PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id),
      actor_user_id UUID REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID,
      changes JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_audit_org_created ON audit_log(organization_id, created_at DESC);
    CREATE INDEX idx_audit_actor_created ON audit_log(actor_user_id, created_at DESC);
    ```

### Phase 8 — RLS Enablement

25. For EVERY tenant-scoped table in sections 2–7, enable and force RLS. The exhaustive list:
    - `organizations` (self-scoped), `memberships`, `invitations`, `brand_kits`
    - `pages`, `page_revisions`
    - `submissions`, `analytics_events`
    - `automation_configs`, `integrations`
    - `availability_calendars`, `calendar_busy_blocks`
    - `automation_jobs`, `audit_log`
26. For each table, run:
    ```sql
    ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
    ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
    ```
    `FORCE` means even the table owner is subject to RLS when not superuser. Prevents forgetting that `forge_owner` runs migrations — during migrations we use a superuser or explicitly set the context.
27. Create the standard tenant-isolation policy for each. For tables with an `organization_id` column:
    ```sql
    CREATE POLICY tenant_isolation ON <table>
      FOR ALL
      USING (organization_id = current_org_id())
      WITH CHECK (organization_id = current_org_id());
    ```
28. Special cases:
    - `organizations`: `USING (id = current_org_id())` — the org itself is self-scoped.
    - `memberships`: expose only memberships of the active org: `USING (organization_id = current_org_id())`. For cross-org queries (e.g., "what orgs am I in"), explicitly unset the context with `RESET app.current_org_id` (or the app queries via the admin role).
29. Write a dedicated test file `tests/test_rls.py` that:
    - Connects as `forge_app` (no BYPASSRLS).
    - Asserts that without `app.current_org_id` set, all queries return zero rows.
    - Creates two orgs with data in each, verifies that setting `app.current_org_id` to org A returns only org A's rows.
    - Tries to INSERT a row with a different `organization_id` than the context — must raise an error from WITH CHECK.
    - Tries to UPDATE a row to change its `organization_id` — must raise an error.
    These tests are the contract. They run on every PR.

### Phase 9 — Stripe Events & Billing Tables

30. Create `stripe_events_processed` for webhook idempotency:
    ```sql
    CREATE TABLE stripe_events_processed (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```
    Not tenant-scoped (Stripe events are global). No RLS.
31. Create `usage_counters` — per-org per-month rollup for billing gates:
    ```sql
    CREATE TABLE usage_counters (
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      period_month DATE NOT NULL,  -- first day of month
      pages_generated INT NOT NULL DEFAULT 0,
      submissions_received INT NOT NULL DEFAULT 0,
      ai_tokens_input BIGINT NOT NULL DEFAULT 0,
      ai_tokens_output BIGINT NOT NULL DEFAULT 0,
      ai_cost_cents INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (organization_id, period_month)
    );
    ```
    Enable RLS.

### Phase 10 — Alembic Wiring & Migration Discipline

32. Every migration has an `upgrade()` AND a working `downgrade()`. No exceptions. If a `downgrade` would be destructive (data loss), the `downgrade` includes a guard (`op.execute("SELECT 1/0")` with a comment) and documentation in the migration header explaining why manual intervention is needed.
33. Migration naming convention: `YYYYMMDD_NNNN_short_description.py`. Use Alembic's `revision --autogenerate` as a starting point but **always** hand-review — autogenerate doesn't understand RLS policies or pg_partman.
34. Add a CI step that runs `alembic upgrade head` then `alembic downgrade base` then `alembic upgrade head` on a throwaway Postgres. Catches broken downgrades before they reach production.
35. Wire SQLAlchemy's async engine with connection pooling:
    ```python
    engine = create_async_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=1800,  # 30 min
        echo=False,
    )
    ```
36. Ensure every pooled connection resets session state on checkin. Critical for RLS — we set `app.current_org_id` per request but must not leak to the next request:
    ```python
    @event.listens_for(engine.sync_engine, "checkin")
    def _reset_session_vars(dbapi_connection, connection_record):
        with dbapi_connection.cursor() as cur:
            cur.execute("RESET app.current_org_id; RESET app.current_user_id; RESET app.is_admin;")
    ```

### Phase 11 — Seed Data & Dev Fixtures

37. Create `apps/api/scripts/seed_dev.py` — idempotent. Creates:
    - A test user `lucy@reds.example` with a known password.
    - An organization "Reds Construction" (slug `reds-construction`).
    - Lucy as Owner.
    - A brand kit with warm cream + teal.
    - 3 demo pages (a form, a proposal, a landing) with fake submissions.
    - A seeded template set of 6 (enough to test the gallery).
    Run it with `python -m scripts.seed_dev` from inside docker-compose. Idempotent means running it twice is a no-op.
38. Separately, `apps/api/scripts/seed_templates.py` — production template seeding. Loads from a YAML fixture under `apps/api/fixtures/templates/*.yml`. One file per template. Version-controlled.

### Phase 12 — Tests & Documentation

39. `tests/test_schema.py` — asserts every tenant-scoped table has RLS enabled (queries `pg_class.relrowsecurity` and `relforcerowsecurity`). If a new table is added later without RLS, this test fails in CI. This is the regression guardrail.
40. `tests/test_partitioning.py` — asserts `submissions` and `analytics_events` are partitioned and have at least the current month + 3 months of future partitions.
41. `tests/test_migrations.py` — the up/down/up test from item 34.
42. `tests/test_seed.py` — runs the dev seed, asserts it's idempotent by running twice.
43. Write `docs/architecture/DATABASE.md` — final schema diagram (mermaid ER diagram), explanation of the RLS strategy, the role hierarchy, how migrations work, how to add a new tenant-scoped table (checklist: add column, add FK, enable+force RLS, create policy, add index, update test_schema).
44. Mission report.

---

## Acceptance Criteria

- All 20+ tables created with correct constraints, FKs, and indexes.
- RLS enabled and forced on every tenant-scoped table.
- `test_rls.py` passes — cross-tenant reads and writes are blocked by the database.
- `submissions` and `analytics_events` are partitioned monthly via pg_partman.
- Alembic migrations are reversible; up/down/up CI check passes.
- `forge_app` role cannot bypass RLS; `forge_owner` only used for migrations.
- Seed scripts are idempotent.
- `test_schema.py` enforces RLS on all future tenant tables.
- `DATABASE.md` documents the architecture.
- Mission report written.

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
