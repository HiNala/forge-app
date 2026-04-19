"""BI-04 — user_preferences column name, org_settings, API tokens, webhooks, notifications, feature flags."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "n2b3i404_bi04"
down_revision: str | Sequence[str] | None = "c9d0e1f2a3b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # users: rename preferences -> user_preferences (mission naming)
    op.alter_column("users", "preferences", new_column_name="user_preferences")

    op.add_column("users", sa.Column("pending_email", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )

    op.add_column(
        "organizations",
        sa.Column(
            "org_settings",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "account_status",
            sa.Text(),
            server_default=sa.text("'active'"),
            nullable=False,
        ),
    )

    op.create_table(
        "api_tokens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("prefix", sa.Text(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("scopes", postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_ip", postgresql.INET(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_api_tokens_org_active",
        "api_tokens",
        ["organization_id"],
        postgresql_where=sa.text("revoked_at IS NULL"),
    )
    op.create_index("ix_api_tokens_prefix", "api_tokens", ["prefix"])

    op.execute("ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE api_tokens FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY api_tokens_tenant ON api_tokens
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid);
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON api_tokens TO forge_app")

    op.create_table(
        "outbound_webhooks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("secret", sa.Text(), nullable=False),
        sa.Column("events", postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "url", name="uq_outbound_webhooks_org_url"),
    )
    op.create_index(
        "ix_outbound_webhooks_organization_id",
        "outbound_webhooks",
        ["organization_id"],
    )
    op.execute("ALTER TABLE outbound_webhooks ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE outbound_webhooks FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY outbound_webhooks_tenant ON outbound_webhooks
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid);
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON outbound_webhooks TO forge_app")

    op.create_table(
        "notifications",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("recipient_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("action_url", sa.Text(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notifications_recipient_created",
        "notifications",
        ["recipient_user_id", "created_at"],
    )
    op.create_index(
        "ix_notifications_unread",
        "notifications",
        ["recipient_user_id", "read_at"],
        postgresql_where=sa.text("read_at IS NULL"),
    )
    op.execute("ALTER TABLE notifications ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE notifications FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY notifications_recipient ON notifications
        FOR ALL
        USING (
          recipient_user_id = current_setting('app.current_user_id', true)::uuid
        )
        WITH CHECK (
          recipient_user_id = current_setting('app.current_user_id', true)::uuid
        );
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO forge_app")

    op.create_table(
        "email_templates_overrides",
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("notify_owner_subject", sa.Text(), nullable=True),
        sa.Column("notify_owner_body", sa.Text(), nullable=True),
        sa.Column("confirm_submitter_subject", sa.Text(), nullable=True),
        sa.Column("confirm_submitter_body", sa.Text(), nullable=True),
        sa.Column("reply_signature", sa.Text(), nullable=True),
        sa.Column("from_name", sa.Text(), nullable=True),
        sa.Column("reply_to_override", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("organization_id"),
    )
    op.execute("ALTER TABLE email_templates_overrides ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE email_templates_overrides FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY email_templates_overrides_tenant ON email_templates_overrides
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid);
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON email_templates_overrides TO forge_app")

    op.create_table(
        "org_feature_flags",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("flag", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("set_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "set_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["set_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("organization_id", "flag"),
    )
    op.execute("ALTER TABLE org_feature_flags ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE org_feature_flags FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY org_feature_flags_tenant ON org_feature_flags
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid);
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON org_feature_flags TO forge_app")

    op.create_table(
        "scheduled_plan_changes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_plan", sa.Text(), nullable=False),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_scheduled_plan_changes_org",
        "scheduled_plan_changes",
        ["organization_id"],
    )
    op.execute("ALTER TABLE scheduled_plan_changes ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE scheduled_plan_changes FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY scheduled_plan_changes_tenant ON scheduled_plan_changes
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid);
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_plan_changes TO forge_app")

    op.add_column("custom_domains", sa.Column("verification_token", sa.Text(), nullable=True))
    op.add_column(
        "custom_domains",
        sa.Column("tls_issued", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("custom_domains", sa.Column("tls_issued_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "custom_domains",
        sa.Column("status", sa.Text(), server_default=sa.text("'pending'"), nullable=False),
    )
    op.add_column("custom_domains", sa.Column("error_message", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("custom_domains", "error_message")
    op.drop_column("custom_domains", "status")
    op.drop_column("custom_domains", "tls_issued_at")
    op.drop_column("custom_domains", "tls_issued")
    op.drop_column("custom_domains", "verification_token")

    op.execute("DROP TABLE IF EXISTS scheduled_plan_changes CASCADE")
    op.execute("DROP TABLE IF EXISTS org_feature_flags CASCADE")
    op.execute("DROP TABLE IF EXISTS email_templates_overrides CASCADE")
    op.execute("DROP TABLE IF EXISTS notifications CASCADE")
    op.execute("DROP TABLE IF EXISTS outbound_webhooks CASCADE")
    op.execute("DROP TABLE IF EXISTS api_tokens CASCADE")

    op.drop_column("organizations", "account_status")
    op.drop_column("organizations", "org_settings")

    op.drop_column("users", "is_admin")
    op.drop_column("users", "pending_email")

    op.alter_column("users", "user_preferences", new_column_name="preferences")
