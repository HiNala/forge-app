"""W-02 — proposals, questions, templates, testimonials, numbering (contractor proposal builder)."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "w02_contractor_proposals"
down_revision: str | Sequence[str] | None = "w01b_submission_booking"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "proposal_sequences",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("year", sa.SmallInteger(), nullable=False),
        sa.Column("next_seq", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("organization_id", "year", name="pk_proposal_sequences"),
    )
    op.create_index("ix_proposal_sequences_org", "proposal_sequences", ["organization_id"])

    op.create_table(
        "proposals",
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("proposal_number", sa.Text(), nullable=True),
        sa.Column("client_name", sa.Text(), nullable=False),
        sa.Column("client_email", postgresql.CITEXT(), nullable=True),
        sa.Column("client_phone", sa.Text(), nullable=True),
        sa.Column("client_address", sa.Text(), nullable=True),
        sa.Column("project_title", sa.Text(), nullable=False),
        sa.Column("project_location", sa.Text(), nullable=True),
        sa.Column("executive_summary", sa.Text(), nullable=True),
        sa.Column(
            "scope_of_work",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "exclusions",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "line_items",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("subtotal_cents", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column("tax_rate_bps", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("tax_cents", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column("total_cents", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "currency", sa.Text(), nullable=False, server_default=sa.text("'USD'")
        ),
        sa.Column(
            "timeline",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("estimated_completion_date", sa.Date(), nullable=True),
        sa.Column("payment_terms", sa.Text(), nullable=False),
        sa.Column("payment_schedule", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("warranty", sa.Text(), nullable=True),
        sa.Column("insurance", sa.Text(), nullable=True),
        sa.Column("license_info", sa.Text(), nullable=True),
        sa.Column("legal_terms", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'draft'"),
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_by_name", sa.Text(), nullable=True),
        sa.Column("decision_by_email", postgresql.CITEXT(), nullable=True),
        sa.Column("decision_ip", postgresql.INET(), nullable=True),
        sa.Column("decision_user_agent", sa.Text(), nullable=True),
        sa.Column("decision_signature_data", sa.Text(), nullable=True),
        sa.Column("decision_signature_kind", sa.Text(), nullable=True),
        sa.Column("signed_pdf_storage_key", sa.Text(), nullable=True),
        sa.Column("parent_proposal_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('draft','sent','viewed','questioned','accepted','declined','expired','superseded')",
            name="ck_proposals_status",
        ),
        sa.CheckConstraint(
            "decision_signature_kind IS NULL OR decision_signature_kind IN ('drawn','typed','click_to_accept')",
            name="ck_proposals_decision_signature_kind",
        ),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_proposal_id"], ["proposals.page_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("page_id"),
    )
    op.create_index("ix_proposals_org", "proposals", ["organization_id"])
    op.create_index("ix_proposals_status", "proposals", ["status"])
    op.create_index("ix_proposals_parent", "proposals", ["parent_proposal_id"])

    op.create_table(
        "proposal_questions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("asker_name", sa.Text(), nullable=True),
        sa.Column("asker_email", postgresql.CITEXT(), nullable=False),
        sa.Column("section_ref", sa.Text(), nullable=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("answered_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("asker_ip", postgresql.INET(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["answered_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "CREATE INDEX idx_proposal_questions_page ON proposal_questions (page_id, created_at DESC)"
    )

    op.create_table(
        "proposal_templates",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("industry", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("scope_blueprint", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("line_items_blueprint", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("terms_template", sa.Text(), nullable=True),
        sa.Column("use_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
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
    op.create_index("ix_proposal_templates_org", "proposal_templates", ["organization_id"])

    op.create_table(
        "org_testimonials",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("attribution", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_org_testimonials_org", "org_testimonials", ["organization_id"])

    for table in ("proposals", "proposal_questions", "proposal_templates", "org_testimonials", "proposal_sequences"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY proposals_tenant ON proposals
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )
    op.execute(
        """
        CREATE POLICY proposal_questions_tenant ON proposal_questions
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )
    op.execute(
        """
        CREATE POLICY proposal_templates_select ON proposal_templates
        FOR SELECT
        USING (
          organization_id IS NULL
          OR organization_id = current_setting('app.current_tenant_id', true)::uuid
        )
        """
    )
    op.execute(
        """
        CREATE POLICY proposal_templates_mutate ON proposal_templates
        FOR INSERT
        WITH CHECK (
          organization_id = current_setting('app.current_tenant_id', true)::uuid
        )
        """
    )
    op.execute(
        """
        CREATE POLICY proposal_templates_update ON proposal_templates
        FOR UPDATE
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )
    op.execute(
        """
        CREATE POLICY proposal_templates_delete ON proposal_templates
        FOR DELETE
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )
    op.execute(
        """
        CREATE POLICY org_testimonials_tenant ON org_testimonials
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )
    op.execute(
        """
        CREATE POLICY proposal_sequences_tenant ON proposal_sequences
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )

    for table in ("proposals", "proposal_questions", "proposal_templates", "org_testimonials", "proposal_sequences"):
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO forge_app")

    # Five starter library templates (system — organization_id NULL)
    op.execute(
        """
        INSERT INTO proposal_templates (
          id, organization_id, name, description, industry, is_system, scope_blueprint, line_items_blueprint, terms_template
        ) VALUES
        (
          gen_random_uuid(), NULL,
          'Residential contractor — fence & exterior',
          'Fence installation, gates, staining; typical residential scope.',
          'contractor',
          true,
          '[{"phase": "Site work", "description": "Stakes, permits coordination, utility locate.", "deliverables": ["Permit packet if required", "Marked utility lines"]}]'::jsonb,
          '[{"category": "Materials", "description": "Pressure-treated lumber & fasteners", "qty": 1, "unit": "lot", "rate_cents": 0, "total_cents": 0}]'::jsonb,
          'Payment: 50% deposit, 50% on completion. Change orders in writing.'
        ),
        (
          gen_random_uuid(), NULL,
          'Freelance designer — brand package',
          'Logo exploration, palette, type, usage guidelines.',
          'design',
          true,
          '[{"phase": "Discovery", "description": "Questionnaire and competitive review.", "deliverables": ["Creative brief"]}]'::jsonb,
          '[{"category": "Labor", "description": "Design time (estimate)", "qty": 40, "unit": "hr", "rate_cents": 12500, "total_cents": 500000}]'::jsonb,
          'Two revision rounds included; additional rounds billed hourly.'
        ),
        (
          gen_random_uuid(), NULL,
          'Freelance developer — fixed-scope sprint',
          'Sprint-based web feature delivery with QA checklist.',
          'developer',
          true,
          '[{"phase": "Sprint 1", "description": "Implement agreed user stories.", "deliverables": ["Staging deploy", "Release notes"]}]'::jsonb,
          '[{"category": "Labor", "description": "Development", "qty": 80, "unit": "hr", "rate_cents": 15000, "total_cents": 12000000}]'::jsonb,
          'Source retained by client on final payment; SLA for critical bugs 14 days.'
        ),
        (
          gen_random_uuid(), NULL,
          'Marketing consultant — retainer + project',
          'Paid media audit + 90-day roadmap + monthly optimization.',
          'marketing',
          true,
          '[{"phase": "Audit", "description": "Account review and competitive set.", "deliverables": ["Findings deck"]}]'::jsonb,
          '[{"category": "Fees", "description": "Monthly retainer", "qty": 3, "unit": "mo", "rate_cents": 450000, "total_cents": 1350000}]'::jsonb,
          'Client provides ad account access; 30-day out clause either party.'
        ),
        (
          gen_random_uuid(), NULL,
          'Coaching — package of sessions',
          '6-session coaching engagement with goals and accountability.',
          'coaching',
          true,
          '[{"phase": "Kickoff", "description": "Goals, success metrics, cadence.", "deliverables": ["Session plan"]}]'::jsonb,
          '[{"category": "Sessions", "description": "60-minute calls", "qty": 6, "unit": "session", "rate_cents": 25000, "total_cents": 150000}]'::jsonb,
          'Cancellation with 24h notice; recordings only with mutual consent.'
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS org_testimonials CASCADE")
    op.execute("DROP TABLE IF EXISTS proposal_templates CASCADE")
    op.execute("DROP TABLE IF EXISTS proposal_questions CASCADE")
    op.execute("DROP TABLE IF EXISTS proposals CASCADE")
    op.execute("DROP TABLE IF EXISTS proposal_sequences CASCADE")
