"""BP-02 — feedback, design memory, and learning reports."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "bp02_feedback_memory"
down_revision: str | Sequence[str] | None = "p07_analytics_export_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_EVENT_CHECK = """
(event_type IN (
'page_view','page_leave','section_dwell','section_exit','scroll_depth','click','cta_click',
'media_play','media_pause','media_complete','outbound_link','link_click','menu_item_view',
'form_view','form_start','form_field_focus','form_field_touch','form_field_blur_valid','form_field_blur_invalid',
'form_field_abandon','form_submit_attempt','form_submit_success','form_submit_error','form_abandon','rsvp_submit',
'survey_step_complete','quiz_complete',
'slot_picker_view','slot_picker_date_navigate','slot_hover','slot_click','slot_hold_created','slot_hold_expired','slot_released',
'proposal_view','proposal_section_view','proposal_question_submit','proposal_accept_click','proposal_accept_success',
'proposal_decline','proposal_print','proposal_download',
'deck_view','slide_view','slide_dwell','present_start','present_slide_view','present_slide_dwell','present_end','deck_export_click',
'studio_prompt_submit','studio_workflow_selected','studio_section_edit_open','studio_section_edit_submit','studio_refine_chip_click',
'studio_provider_switch','studio_preview_viewport_change','studio_revision_open','studio_revision_restore','feedback_submitted',
'page_publish_click','page_publish_success','page_unpublish','page_delete','page_duplicate',
'dashboard_view','dashboard_filter_change','dashboard_search','page_detail_view','submissions_tab_open','submission_reply_send',
'template_use_click','export_initiated','export_completed','export_failed','integration_connect','settings_change',
'signup_start','signup_complete','onboarding_step_complete','first_page_created','first_page_published','first_submission_received',
'first_proposal_accepted','plan_upgrade_click','plan_upgrade_success','plan_downgrade','plan_cancel','billing_portal_open',
'plan_upgrade_success','trial_ended','invitation_sent','invitation_accepted',
'quota_warning_view','quota_exceeded_view','error_boundary_caught','api_error_surfaced','identity_merge'
) OR (event_type ~ '^custom\\.[a-z0-9][a-z0-9_.-]*$' AND char_length(event_type) < 200))
"""


def upgrade() -> None:
    # BP-01 ``p08_design_memory_bp01`` already creates ``design_memory`` and orchestration extras.
    # Idempotent additive columns only (duplicate migration heads merged via ``merge_bp02_aal03``).
    op.execute(
        "ALTER TABLE orchestration_runs ADD COLUMN IF NOT EXISTS quality_score NUMERIC"
    )
    op.execute(
        "ALTER TABLE orchestration_runs ADD COLUMN IF NOT EXISTS dimension_scores JSONB"
    )

    op.create_table(
        "artifact_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_kind", sa.Text(), nullable=False),
        sa.Column("artifact_ref", sa.Text(), nullable=False),
        sa.Column("sentiment", sa.Text(), nullable=False),
        sa.Column("structured_reasons", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("free_text", sa.Text(), nullable=True),
        sa.Column("action_taken", sa.Text(), nullable=True),
        sa.Column("preceded_refine_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("sentiment IN ('positive','negative','improvement_request')", name="ck_artifact_feedback_sentiment"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["run_id"], ["orchestration_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["preceded_refine_run_id"], ["orchestration_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "user_id",
            "run_id",
            "artifact_kind",
            "artifact_ref",
            name="uq_artifact_feedback_user_artifact",
        ),
    )
    op.create_index("idx_feedback_run", "artifact_feedback", ["run_id"])
    op.create_index("idx_feedback_org", "artifact_feedback", ["organization_id", sa.text("created_at DESC")])
    op.create_index("idx_feedback_pattern", "artifact_feedback", ["artifact_kind", "sentiment", "action_taken"])
    op.execute("ALTER TABLE artifact_feedback ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE artifact_feedback FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY artifact_feedback_tenant ON artifact_feedback
        FOR ALL
        USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        """
    )

    op.add_column("page_revisions", sa.Column("change_reason", sa.Text(), nullable=True))
    op.add_column(
        "page_revisions",
        sa.Column(
            "change_kind",
            sa.Text(),
            sa.CheckConstraint(
                "change_kind IS NULL OR change_kind IN ('initial','full_refine','region_edit','manual_edit','feedback_driven_refine','auto_improve','section_edit')",
                name="ck_page_revisions_change_kind",
            ),
            nullable=True,
        ),
    )
    op.add_column("page_revisions", sa.Column("preceding_feedback_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("page_revisions", sa.Column("preceding_run_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("page_revisions", sa.Column("quality_score", sa.Numeric(), nullable=True))
    op.add_column("page_revisions", sa.Column("dimension_scores", postgresql.JSONB(), nullable=True))
    op.create_foreign_key("fk_page_revisions_feedback", "page_revisions", "artifact_feedback", ["preceding_feedback_id"], ["id"])
    op.create_foreign_key("fk_page_revisions_run", "page_revisions", "orchestration_runs", ["preceding_run_id"], ["id"])

    op.create_table(
        "improvement_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("metrics", postgresql.JSONB(), nullable=False),
        sa.Column("patterns", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_improvement_reports_organization_id", "improvement_reports", ["organization_id"])

    op.execute("ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS ck_analytics_events_event_type")
    op.execute("ALTER TABLE analytics_events ADD CONSTRAINT ck_analytics_events_event_type CHECK " + _EVENT_CHECK.strip())


def downgrade() -> None:
    op.execute("ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS ck_analytics_events_event_type")
    op.execute("DROP INDEX IF EXISTS ix_improvement_reports_organization_id")
    op.drop_table("improvement_reports")
    op.drop_constraint("fk_page_revisions_run", "page_revisions", type_="foreignkey")
    op.drop_constraint("fk_page_revisions_feedback", "page_revisions", type_="foreignkey")
    op.drop_column("page_revisions", "dimension_scores")
    op.drop_column("page_revisions", "quality_score")
    op.drop_column("page_revisions", "preceding_run_id")
    op.drop_column("page_revisions", "preceding_feedback_id")
    op.drop_column("page_revisions", "change_kind")
    op.drop_column("page_revisions", "change_reason")
    op.execute("DROP POLICY IF EXISTS artifact_feedback_tenant ON artifact_feedback")
    op.drop_index("idx_feedback_pattern", table_name="artifact_feedback")
    op.drop_index("idx_feedback_org", table_name="artifact_feedback")
    op.drop_index("idx_feedback_run", table_name="artifact_feedback")
    op.drop_table("artifact_feedback")
    op.execute(
        "ALTER TABLE orchestration_runs DROP COLUMN IF EXISTS dimension_scores"
    )
    op.execute("ALTER TABLE orchestration_runs DROP COLUMN IF EXISTS quality_score")
