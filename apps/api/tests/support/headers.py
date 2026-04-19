"""Test auth headers (AUTH_TEST_BYPASS + ENVIRONMENT=test)."""

from __future__ import annotations

import uuid


def forge_test_headers(user_id: uuid.UUID, organization_id: uuid.UUID) -> dict[str, str]:
    return {
        "x-forge-test-user-id": str(user_id),
        "x-forge-active-org-id": str(organization_id),
    }
