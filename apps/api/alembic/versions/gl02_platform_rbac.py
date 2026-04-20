"""GL-02 — platform RBAC tables, MV llm_cost_daily, audit_log.platform context."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "gl02_platform_rbac"
down_revision: str | Sequence[str] | None = "o04_page_review_quality"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "platform_permissions",
        sa.Column("key", sa.Text(), primary_key=True),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("sensitive", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_table(
        "platform_roles",
        sa.Column("key", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("system", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.create_table(
        "platform_role_permissions",
        sa.Column("role_key", sa.Text(), sa.ForeignKey("platform_roles.key", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "permission_key",
            sa.Text(),
            sa.ForeignKey("platform_permissions.key", ondelete="CASCADE"),
            primary_key=True,
        ),
    )
    op.create_table(
        "platform_user_roles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_key", sa.Text(), sa.ForeignKey("platform_roles.key", ondelete="CASCADE"), primary_key=True),
        sa.Column("granted_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_platform_user_roles_user", "platform_user_roles", ["user_id"])

    op.add_column("users", sa.Column("platform_last_visit_at", sa.DateTime(timezone=True), nullable=True))

    op.alter_column("audit_log", "organization_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.add_column(
        "audit_log",
        sa.Column("action_context", sa.Text(), nullable=False, server_default="tenant"),
    )

    # --- Seed permissions (idempotent via ON CONFLICT)
    perms: list[tuple[str, str, str, bool]] = [
        # orgs
        ("orgs:read_list", "orgs", "List organizations across tenants", False),
        ("orgs:read_detail", "orgs", "View a single organization", False),
        ("orgs:edit_plan", "orgs", "Change org subscription plan", False),
        ("orgs:suspend", "orgs", "Suspend an organization", True),
        ("orgs:unsuspend", "orgs", "Unsuspend an organization", False),
        ("orgs:delete", "orgs", "Schedule org deletion", True),
        ("orgs:restore", "orgs", "Restore a soft-deleted org", False),
        # users
        ("users:read_list", "users", "List users across tenants", False),
        ("users:read_detail", "users", "View user profile", False),
        ("users:edit_platform_roles", "users", "Grant or revoke platform roles", True),
        ("users:reset_email", "users", "Trigger email reset flow", True),
        ("users:force_mfa", "users", "Force MFA enrollment", True),
        ("users:force_logout", "users", "Revoke active sessions", False),
        ("users:terminate", "users", "Terminate user account", True),
        # billing
        ("billing:read_mrr", "billing", "View MRR and revenue metrics", False),
        ("billing:read_invoices", "billing", "View Stripe invoices", False),
        ("billing:issue_refund", "billing", "Issue Stripe refund", True),
        ("billing:apply_credit", "billing", "Apply account credit", False),
        ("billing:edit_plan_terms", "billing", "Edit custom plan terms", False),
        # analytics
        ("analytics:read_org_metrics", "analytics", "Read per-org analytics", False),
        ("analytics:read_platform_metrics", "analytics", "Read platform-wide analytics", False),
        ("analytics:export", "analytics", "Export analytics CSV", False),
        # llm
        ("llm:read_usage", "llm", "View token and usage rollups", False),
        ("llm:read_cost_attribution", "llm", "View cost by org/user/page", False),
        ("llm:read_run_traces", "llm", "Inspect orchestration run traces", False),
        ("llm:edit_routing", "llm", "Change LLM routing defaults", True),
        # system
        ("system:read_health", "system", "View health and queue metrics", False),
        ("system:read_logs", "system", "View aggregated logs", False),
        ("system:toggle_feature_flags", "system", "Toggle feature flags", False),
        ("system:manage_templates", "system", "Manage global templates", False),
        ("system:manage_permissions", "system", "Edit permission catalog", True),
        # impersonation
        ("impersonate:start", "impersonation", "Start impersonation session", False),
        ("impersonate:any_org", "impersonation", "Impersonate any org without prior membership", True),
        # audit
        ("audit:read_all", "audit", "Read platform audit log", False),
    ]

    bind = op.get_bind()
    for key, cat, desc, sens in perms:
        bind.execute(
            sa.text(
                """
                INSERT INTO platform_permissions (key, category, description, sensitive)
                VALUES (:k, :c, :d, :s)
                ON CONFLICT (key) DO NOTHING
                """
            ),
            {"k": key, "c": cat, "d": desc, "s": sens},
        )

    roles: list[tuple[str, str, str]] = [
        ("super_admin", "Super Admin", "Full platform access — grant manually via DB bootstrap."),
        ("admin", "Admin", "Trusted operator; cannot edit platform roles or permissions."),
        ("support", "Support", "Read-only org/user + impersonate + traces for debugging."),
        ("analyst", "Analyst", "Business metrics and LLM cost visibility."),
        ("billing", "Billing", "Finance operations and refunds."),
    ]
    for key, name, desc in roles:
        bind.execute(
            sa.text(
                """
                INSERT INTO platform_roles (key, name, description, system)
                VALUES (:k, :n, :d, true)
                ON CONFLICT (key) DO NOTHING
                """
            ),
            {"k": key, "n": name, "d": desc},
        )

    all_keys = [p[0] for p in perms]

    def grant(role: str, keys: list[str]) -> None:
        for pk in keys:
            bind.execute(
                sa.text(
                    """
                    INSERT INTO platform_role_permissions (role_key, permission_key)
                    VALUES (:r, :p)
                    ON CONFLICT DO NOTHING
                    """
                ),
                {"r": role, "p": pk},
            )

    grant("super_admin", all_keys)

    admin_exclude = {"users:edit_platform_roles", "users:terminate", "system:manage_permissions"}
    grant("admin", [k for k in all_keys if k not in admin_exclude])

    grant(
        "support",
        [
            "orgs:read_list",
            "orgs:read_detail",
            "users:read_list",
            "users:read_detail",
            "impersonate:start",
            "audit:read_all",
            "llm:read_run_traces",
        ],
    )

    grant(
        "analyst",
        [
            "analytics:read_platform_metrics",
            "analytics:export",
            "llm:read_usage",
            "llm:read_cost_attribution",
            "billing:read_mrr",
        ],
    )

    grant(
        "billing",
        [
            "billing:read_mrr",
            "billing:read_invoices",
            "billing:issue_refund",
            "billing:apply_credit",
            "billing:edit_plan_terms",
            "orgs:read_list",
            "orgs:read_detail",
            "orgs:edit_plan",
        ],
    )

    op.execute(
        """
        CREATE MATERIALIZED VIEW IF NOT EXISTS llm_cost_daily AS
        SELECT
          r.organization_id,
          (r.created_at AT TIME ZONE 'UTC')::date AS day,
          r.graph_name,
          COALESCE(r.intent->>'workflow', 'unknown') AS workflow,
          k.role AS pipeline_role,
          COALESCE(r.review_findings->>'provider', 'unknown') AS provider,
          COALESCE(r.review_findings->>'model', 'unknown') AS model,
          COUNT(*)::bigint AS run_count,
          SUM(r.total_tokens_input)::bigint AS tokens_input,
          SUM(r.total_tokens_output)::bigint AS tokens_output,
          SUM(r.total_cost_cents)::bigint AS cost_cents,
          AVG(r.total_duration_ms)::double precision AS avg_duration_ms,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY r.total_duration_ms)::double precision AS p95_duration_ms
        FROM orchestration_runs r
        CROSS JOIN LATERAL jsonb_object_keys(COALESCE(r.node_timings, '{}'::jsonb)) AS k(role)
        GROUP BY 1, 2, 3, 4, 5, 6, 7
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_llm_cost_daily_row ON llm_cost_daily "
        "(organization_id, day, graph_name, workflow, pipeline_role, provider, model)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_llm_cost_daily_row")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS llm_cost_daily")
    op.drop_column("audit_log", "action_context")
    op.alter_column("audit_log", "organization_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.drop_column("users", "platform_last_visit_at")
    op.drop_index("idx_platform_user_roles_user", table_name="platform_user_roles")
    op.drop_table("platform_user_roles")
    op.drop_table("platform_role_permissions")
    op.drop_table("platform_roles")
    op.drop_table("platform_permissions")
