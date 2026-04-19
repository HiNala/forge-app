"""BI-01 — RLS helpers, organizations isolation, audit_log, optional roles.

Revision ID: b7c8d9e0f1a2
Revises: f1e2d3c4b5a6
Create Date: 2026-04-19

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b7c8d9e0f1a2"
down_revision: str | Sequence[str] | None = "m8a1b2c3d4e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.current_org_id() RETURNS uuid
        LANGUAGE sql STABLE
        AS $$
          SELECT COALESCE(
            NULLIF(current_setting('app.current_org_id', true), '')::uuid,
            NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
          );
        $$;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid
        LANGUAGE sql STABLE
        AS $$
          SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
        $$;
        """
    )

    op.execute("ALTER TABLE organizations ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE organizations FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY organizations_tenant_isolation ON organizations
          FOR ALL
          USING (id = current_org_id())
          WITH CHECK (id = current_org_id());
        """
    )

    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("resource_type", sa.Text(), nullable=False),
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("changes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "CREATE INDEX ix_audit_log_organization_id_created_at "
        "ON audit_log (organization_id, created_at DESC)"
    )
    op.execute(
        "CREATE INDEX ix_audit_log_actor_user_id_created_at "
        "ON audit_log (actor_user_id, created_at DESC)"
    )
    op.execute("ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE audit_log FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY audit_log_tenant_isolation ON audit_log
          FOR ALL
          USING (organization_id = current_org_id())
          WITH CHECK (organization_id = current_org_id());
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'forge_owner') THEN
            CREATE ROLE forge_owner LOGIN PASSWORD 'forge_owner_dev_change_me' BYPASSRLS;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'forge_admin') THEN
            CREATE ROLE forge_admin LOGIN PASSWORD 'forge_admin_dev_change_me' BYPASSRLS;
          END IF;
        END
        $$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
          EXECUTE format('GRANT CONNECT ON DATABASE %I TO forge_owner', current_database());
          EXECUTE format('GRANT CONNECT ON DATABASE %I TO forge_admin', current_database());
        END
        $$;
        """
    )
    op.execute("GRANT USAGE ON SCHEMA public TO forge_owner")
    op.execute("GRANT USAGE ON SCHEMA public TO forge_admin")
    op.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO forge_owner")
    op.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO forge_owner")
    op.execute("GRANT SELECT ON ALL TABLES IN SCHEMA public TO forge_admin")

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON audit_log TO forge_app")
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_log_id_seq') THEN "
        "GRANT USAGE, SELECT ON SEQUENCE audit_log_id_seq TO forge_app; "
        "END IF; END $$"
    )

    # Mission 08 created custom_domains with RLS but not FORCE — align with tenant isolation bar.
    op.execute(
        "ALTER TABLE custom_domains FORCE ROW LEVEL SECURITY"
    )

    # pg_partman registration for native partitions: migration ``w03_bi01_partman`` (after ``w03_pitch_decks``).


def downgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_log_id_seq') THEN "
        "REVOKE ALL ON SEQUENCE audit_log_id_seq FROM forge_app; "
        "END IF; END $$"
    )
    op.execute("REVOKE ALL ON TABLE audit_log FROM forge_app")

    op.execute("REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM forge_admin")
    op.execute("REVOKE USAGE ON SCHEMA public FROM forge_admin")
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'forge_admin') THEN
            EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM forge_admin', current_database());
            DROP ROLE forge_admin;
          END IF;
        END
        $$;
        """
    )

    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM forge_owner")
    op.execute("REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM forge_owner")
    op.execute("REVOKE USAGE ON SCHEMA public FROM forge_owner")
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'forge_owner') THEN
            EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM forge_owner', current_database());
            DROP ROLE forge_owner;
          END IF;
        END
        $$;
        """
    )

    op.execute("DROP TABLE IF EXISTS audit_log CASCADE")

    op.execute("DROP POLICY IF EXISTS organizations_tenant_isolation ON organizations")
    op.execute("ALTER TABLE organizations NO FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE organizations DISABLE ROW LEVEL SECURITY")

    op.execute("ALTER TABLE custom_domains NO FORCE ROW LEVEL SECURITY")

    op.execute("DROP FUNCTION IF EXISTS public.current_user_id()")
    op.execute("DROP FUNCTION IF EXISTS public.current_org_id()")
