"""GL-01 — Engagement analytics: taxonomy CHECK, columns, identity, funnels, segments, experiments, retention MV.

Old-type migration strategy (pre-GL-01 client/server):
- ``form_submit`` (server + legacy tracker) → ``form_submit_success``
- ``proposal_accept`` (button) → ``proposal_accept_click``
- ``present_started`` → ``present_start``
- ``present_slide_viewed`` → ``present_slide_view``
- ``present_ended`` → ``present_end``

These UPDATEs are idempotent for rows already migrated.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

from alembic import op
from app.services.analytics.events import EVENTS

revision: str = "g101_gl01_engagement_analytics"
down_revision: str | Sequence[str] | None = "n2b3i405_lookup"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_EVENT_CHECK = """
(event_type IN (
'page_view','page_leave','section_dwell','section_exit','scroll_depth','click','cta_click',
'media_play','media_pause','media_complete','outbound_link',
'form_view','form_start','form_field_focus','form_field_touch','form_field_blur_valid','form_field_blur_invalid',
'form_field_abandon','form_submit_attempt','form_submit_success','form_submit_error','form_abandon',
'slot_picker_view','slot_picker_date_navigate','slot_hover','slot_click','slot_hold_created','slot_hold_expired','slot_released',
'proposal_view','proposal_section_view','proposal_question_submit','proposal_accept_click','proposal_accept_success',
'proposal_decline','proposal_print','proposal_download',
'deck_view','slide_view','slide_dwell','present_start','present_slide_view','present_slide_dwell','present_end','deck_export_click',
'studio_prompt_submit','studio_workflow_selected','studio_section_edit_open','studio_section_edit_submit','studio_refine_chip_click',
'studio_provider_switch','studio_preview_viewport_change','studio_revision_open','studio_revision_restore',
'page_publish_click','page_publish_success','page_unpublish','page_delete','page_duplicate',
'dashboard_view','dashboard_filter_change','dashboard_search','page_detail_view','submissions_tab_open','submission_reply_send',
'template_use_click','integration_connect','settings_change',
'signup_start','signup_complete','onboarding_step_complete','first_page_created','first_page_published','first_submission_received',
'first_proposal_accepted','plan_upgrade_click','plan_upgrade_success','plan_downgrade','plan_cancel','billing_portal_open',
'trial_ended','invitation_sent','invitation_accepted',
'quota_warning_view','quota_exceeded_view','error_boundary_caught','api_error_surfaced',
'identity_merge'
) OR (event_type ~ '^custom\\.[a-z0-9][a-z0-9_.-]*$' AND char_length(event_type) < 200))
"""


def upgrade() -> None:
    op.alter_column(
        "analytics_events",
        "event_type",
        existing_type=sa.String(length=64),
        type_=sa.String(length=200),
        existing_nullable=False,
    )

    op.add_column(
        "analytics_events",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_analytics_events_user_id",
        "analytics_events",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "analytics_events",
        sa.Column("event_source", sa.Text(), nullable=True),
    )
    op.add_column("analytics_events", sa.Column("workflow", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("surface", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("referrer_domain", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("utm_source", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("utm_medium", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("utm_campaign", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("utm_content", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("utm_term", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("browser", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("os", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("device_model", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("viewport_width", sa.Integer(), nullable=True))
    op.add_column("analytics_events", sa.Column("viewport_height", sa.Integer(), nullable=True))
    op.add_column("analytics_events", sa.Column("locale", sa.Text(), nullable=True))
    op.add_column("analytics_events", sa.Column("timezone", sa.Text(), nullable=True))
    op.add_column(
        "analytics_events",
        sa.Column("country_code", sa.Text(), nullable=True),
    )
    op.add_column(
        "analytics_events",
        sa.Column(
            "experiment_arm",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "analytics_events",
        sa.Column(
            "feature_flags",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "analytics_events",
        sa.Column("client_event_id", sa.Text(), nullable=True),
    )
    op.add_column(
        "analytics_events",
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.alter_column("analytics_events", "page_id", existing_type=postgresql.UUID(), nullable=True)

    # Async SQLAlchemy/asyncpg: one statement per execute (no multi-statement batches).
    op.execute(
        "UPDATE analytics_events SET event_type = 'form_submit_success' WHERE event_type = 'form_submit'"
    )
    op.execute(
        "UPDATE analytics_events SET event_type = 'proposal_accept_click' WHERE event_type = 'proposal_accept'"
    )
    op.execute(
        "UPDATE analytics_events SET event_type = 'present_start' WHERE event_type = 'present_started'"
    )
    op.execute(
        "UPDATE analytics_events SET event_type = 'present_slide_view' WHERE event_type = 'present_slide_viewed'"
    )
    op.execute(
        "UPDATE analytics_events SET event_type = 'present_end' WHERE event_type = 'present_ended'"
    )
    op.execute(
        "UPDATE analytics_events SET event_type = 'template_use_click' WHERE event_type = 'template_used'"
    )
    # Map any legacy or unknown types to a safe allowed value before CHECK (partitioned table).
    _allowed = ", ".join(sorted(f"'{k}'" for k in EVENTS))
    op.execute(
        text(
            f"""
            UPDATE analytics_events
            SET event_type = 'page_view'
            WHERE event_type NOT IN ({_allowed})
              AND event_type !~ '^custom\\.[a-z0-9][a-z0-9_.-]*$'
            """
        )
    )

    op.execute(
        "ALTER TABLE analytics_events ADD CONSTRAINT ck_analytics_events_event_type CHECK "
        + _EVENT_CHECK.strip()
    )

    op.execute(
        """
        ALTER TABLE analytics_events ADD CONSTRAINT ck_analytics_events_event_source
        CHECK (event_source IS NULL OR event_source IN ('public_page','web_app','mobile_app','server','webhook'))
        """
    )

    op.create_index(
        "idx_events_org_user_created",
        "analytics_events",
        ["organization_id", "user_id", "created_at"],
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )
    op.create_index(
        "idx_events_org_session",
        "analytics_events",
        ["organization_id", "session_id", "created_at"],
    )
    op.create_index(
        "idx_events_org_page_event_created",
        "analytics_events",
        ["organization_id", "page_id", "event_type", "created_at"],
    )
    op.create_index(
        "idx_events_utm",
        "analytics_events",
        ["organization_id", "utm_campaign", "created_at"],
        postgresql_where=sa.text("utm_campaign IS NOT NULL"),
    )
    op.create_index(
        "idx_events_workflow",
        "analytics_events",
        ["organization_id", "workflow", "created_at"],
        postgresql_where=sa.text("workflow IS NOT NULL"),
    )

    op.create_table(
        "identity_merges",
        sa.Column("visitor_id", sa.Text(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "merged_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("visitor_id", "user_id"),
    )
    op.create_index("idx_identity_merges_user", "identity_merges", ["user_id"])

    op.create_table(
        "analytics_funnels",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("definition", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_system", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analytics_funnels_org", "analytics_funnels", ["organization_id"])

    op.create_table(
        "analytics_segments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analytics_segments_org", "analytics_segments", ["organization_id"])

    op.create_table(
        "custom_event_definitions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("required_properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("optional_properties", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_custom_event_definitions_org_name"),
    )

    op.create_table(
        "experiments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("variants", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("winner_variant", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "key", name="uq_experiments_org_key"),
    )
    op.create_index("ix_experiments_org", "experiments", ["organization_id"])

    op.create_table(
        "analytics_export_jobs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_to", sa.DateTime(timezone=True), nullable=False),
        sa.Column("format", sa.Text(), nullable=False),
        sa.Column("filters", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="queued"),
        sa.Column("storage_key", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analytics_export_jobs_org", "analytics_export_jobs", ["organization_id"])

    op.execute(
        """
        CREATE MATERIALIZED VIEW retention_signup_weekly AS
        WITH cohorts AS (
          SELECT organization_id, user_id,
            date_trunc('week', MIN(created_at)) AS cohort_week
          FROM analytics_events
          WHERE event_type = 'signup_complete' AND user_id IS NOT NULL
          GROUP BY organization_id, user_id
        ),
        ret AS (
          SELECT DISTINCT
            c.organization_id,
            c.cohort_week,
            c.user_id,
            LEAST(12, GREATEST(0,
              FLOOR(EXTRACT(EPOCH FROM (e.created_at - c.cohort_week)) / 604800.0)::int
            ))::int AS period
          FROM cohorts c
          INNER JOIN analytics_events e
            ON e.organization_id = c.organization_id
           AND e.user_id = c.user_id
           AND e.created_at >= c.cohort_week
          WHERE e.event_type IN (
            'first_page_created', 'page_publish_success', 'submission_reply_send'
          )
        )
        SELECT
          r.organization_id,
          r.cohort_week,
          r.period,
          COUNT(DISTINCT r.user_id)::bigint AS returning_users,
          (SELECT COUNT(*)::bigint FROM cohorts c2
           WHERE c2.organization_id = r.organization_id AND c2.cohort_week = r.cohort_week) AS cohort_size
        FROM ret r
        GROUP BY r.organization_id, r.cohort_week, r.period
        """
    )
    op.execute("CREATE INDEX ix_retention_signup_weekly_org ON retention_signup_weekly (organization_id, cohort_week)")

    op.execute("ALTER TABLE identity_merges ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE identity_merges FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY identity_merges_tenant ON identity_merges
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.user_id = identity_merges.user_id
              AND m.organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM memberships m
            WHERE m.user_id = identity_merges.user_id
              AND m.organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
          )
        )
        """
    )

    for tbl in (
        "analytics_funnels",
        "analytics_segments",
        "custom_event_definitions",
        "analytics_export_jobs",
    ):
        op.execute(f'ALTER TABLE "{tbl}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{tbl}" FORCE ROW LEVEL SECURITY')
        op.execute(
            f"""
            CREATE POLICY forge_tenant_isolation ON "{tbl}"
            FOR ALL
            USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            """
        )

    op.execute("ALTER TABLE experiments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE experiments FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY experiments_tenant ON experiments
        FOR ALL
        USING (
          organization_id IS NULL
          OR organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
          organization_id IS NULL
          OR organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        """
    )

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON identity_merges TO forge_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_funnels TO forge_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_segments TO forge_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON custom_event_definitions TO forge_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON experiments TO forge_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_export_jobs TO forge_app")
    op.execute("GRANT SELECT ON retention_signup_weekly TO forge_app")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_retention_signup_weekly_org")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS retention_signup_weekly")

    op.execute("DROP POLICY IF EXISTS experiments_tenant ON experiments")
    op.execute("DROP POLICY IF EXISTS forge_tenant_isolation ON analytics_export_jobs")
    op.execute("DROP POLICY IF EXISTS forge_tenant_isolation ON custom_event_definitions")
    op.execute("DROP POLICY IF EXISTS forge_tenant_isolation ON analytics_segments")
    op.execute("DROP POLICY IF EXISTS forge_tenant_isolation ON analytics_funnels")
    op.execute("DROP POLICY IF EXISTS identity_merges_tenant ON identity_merges")

    op.drop_table("analytics_export_jobs")
    op.drop_table("experiments")
    op.drop_table("custom_event_definitions")
    op.drop_table("analytics_segments")
    op.drop_table("analytics_funnels")
    op.drop_table("identity_merges")

    op.drop_index("idx_events_workflow", table_name="analytics_events")
    op.drop_index("idx_events_utm", table_name="analytics_events")
    op.drop_index("idx_events_org_page_event_created", table_name="analytics_events")
    op.drop_index("idx_events_org_session", table_name="analytics_events")
    op.drop_index("idx_events_org_user_created", table_name="analytics_events")

    op.execute("ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS ck_analytics_events_event_source")
    op.execute("ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS ck_analytics_events_event_type")

    op.alter_column("analytics_events", "page_id", existing_type=postgresql.UUID(), nullable=False)

    op.drop_column("analytics_events", "received_at")
    op.drop_column("analytics_events", "client_event_id")
    op.drop_column("analytics_events", "feature_flags")
    op.drop_column("analytics_events", "experiment_arm")
    op.drop_column("analytics_events", "country_code")
    op.drop_column("analytics_events", "timezone")
    op.drop_column("analytics_events", "locale")
    op.drop_column("analytics_events", "viewport_height")
    op.drop_column("analytics_events", "viewport_width")
    op.drop_column("analytics_events", "device_model")
    op.drop_column("analytics_events", "os")
    op.drop_column("analytics_events", "browser")
    op.drop_column("analytics_events", "utm_term")
    op.drop_column("analytics_events", "utm_content")
    op.drop_column("analytics_events", "utm_campaign")
    op.drop_column("analytics_events", "utm_medium")
    op.drop_column("analytics_events", "utm_source")
    op.drop_column("analytics_events", "referrer_domain")
    op.drop_column("analytics_events", "surface")
    op.drop_column("analytics_events", "workflow")
    op.drop_column("analytics_events", "event_source")
    op.drop_constraint("fk_analytics_events_user_id", "analytics_events", type_="foreignkey")
    op.drop_column("analytics_events", "user_id")
