"""mission02: soft delete, FORCE RLS, membership policies, forge_app role

Revision ID: c4f8a1b92e3d
Revises: 2a517e73c899
Create Date: 2026-04-18

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c4f8a1b92e3d"
down_revision: str | Sequence[str] | None = "2a517e73c899"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

RLS_TABLES = (
    "memberships",
    "invitations",
    "brand_kits",
    "calendar_connections",
    "pages",
    "submission_files",
    "submission_replies",
    "subscription_usage",
    "analytics_events",
    "automation_rules",
    "conversations",
    "page_revisions",
    "page_versions",
    "automation_runs",
    "messages",
    "submissions",
)


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("scheduled_purge_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # --- memberships: replace single-tenant policy with split policies (see MULTI_TENANCY.md)
    op.execute("DROP POLICY IF EXISTS forge_tenant_isolation ON memberships")
    op.execute(
        """
        CREATE POLICY memberships_select ON memberships FOR SELECT
        USING (
          (
            NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL
            AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
          )
          OR (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
            AND organization_id
                = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
          )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY memberships_insert ON memberships FOR INSERT
        WITH CHECK (
          NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL
          AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
          AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
          AND organization_id
            = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        """
    )
    op.execute(
        """
        CREATE POLICY memberships_update ON memberships FOR UPDATE
        USING (
          NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
          AND organization_id
            = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
          NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
          AND organization_id
            = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        """
    )
    op.execute(
        """
        CREATE POLICY memberships_delete ON memberships FOR DELETE
        USING (
          NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
          AND organization_id
            = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        """
    )

    # --- invitations: token-based lookup for public accept flow (session var set per request)
    op.execute(
        """
        CREATE POLICY invitations_by_token ON invitations FOR SELECT
        USING (
          NULLIF(current_setting('app.invitation_token', true), '') IS NOT NULL
          AND token = current_setting('app.invitation_token', true)
        )
        """
    )

    for tbl in RLS_TABLES:
        op.execute(f'ALTER TABLE "{tbl}" FORCE ROW LEVEL SECURITY')

    # --- application role (no BYPASSRLS) — migrations still run as superuser
    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'forge_app') THEN
            CREATE ROLE forge_app LOGIN PASSWORD 'forge_app_dev_change_me';
          END IF;
        END
        $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          EXECUTE format('GRANT CONNECT ON DATABASE %I TO forge_app', current_database());
        END
        $$;
        """
    )
    op.execute("GRANT USAGE ON SCHEMA public TO forge_app")
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO forge_app"
    )
    op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO forge_app")
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE "
        "ON TABLES TO forge_app"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO forge_app"
    )


def downgrade() -> None:
    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM forge_app")
    op.execute("REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM forge_app")
    op.execute("REVOKE USAGE ON SCHEMA public FROM forge_app")
    op.execute(
        """
        DO $$
        BEGIN
          EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM forge_app', current_database());
        EXCEPTION WHEN undefined_object THEN
          NULL;
        END
        $$;
        """
    )
    op.execute(
        """
        ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
          REVOKE ALL ON TABLES FROM forge_app
        """
    )
    op.execute(
        """
        ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
          REVOKE ALL ON SEQUENCES FROM forge_app
        """
    )
    op.execute("DROP ROLE IF EXISTS forge_app")

    for tbl in RLS_TABLES:
        op.execute(f'ALTER TABLE "{tbl}" NO FORCE ROW LEVEL SECURITY')

    op.execute("DROP POLICY IF EXISTS invitations_by_token ON invitations")
    op.execute("DROP POLICY IF EXISTS memberships_select ON memberships")
    op.execute("DROP POLICY IF EXISTS memberships_insert ON memberships")
    op.execute("DROP POLICY IF EXISTS memberships_update ON memberships")
    op.execute("DROP POLICY IF EXISTS memberships_delete ON memberships")

    op.execute(
        """
        CREATE POLICY forge_tenant_isolation ON memberships
        FOR ALL
        USING (
          current_setting('app.current_tenant_id', true) IS NOT NULL
          AND organization_id = current_setting('app.current_tenant_id', true)::uuid
        )
        WITH CHECK (
          current_setting('app.current_tenant_id', true) IS NOT NULL
          AND organization_id = current_setting('app.current_tenant_id', true)::uuid
        )
        """
    )

    op.drop_column("users", "deleted_at")
    op.drop_column("organizations", "scheduled_purge_at")
    op.drop_column("organizations", "deleted_at")
