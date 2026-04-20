"""Allow API token authentication to SELECT api_tokens before tenant GUC is known."""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "n2b3i405_lookup"
# Linearize after orchestration branch (parallel to n2b3i404 → w01…); mutates api_tokens from BI-04.
down_revision: str | Sequence[str] | None = "o02_orchestration_runs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP POLICY IF EXISTS api_tokens_tenant ON api_tokens")
    op.execute(
        """
        CREATE POLICY api_tokens_tenant ON api_tokens
        FOR ALL
        USING (
          organization_id = NULLIF(
            current_setting('app.current_tenant_id', true), ''
          )::uuid
          OR (
            prefix = NULLIF(current_setting('app.api_token_lookup_prefix', true), '')
            AND token_hash = NULLIF(current_setting('app.api_token_lookup_hash', true), '')
          )
        )
        WITH CHECK (
          organization_id = NULLIF(
            current_setting('app.current_tenant_id', true), ''
          )::uuid
        );
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS api_tokens_tenant ON api_tokens")
    op.execute(
        """
        CREATE POLICY api_tokens_tenant ON api_tokens
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid);
        """
    )
