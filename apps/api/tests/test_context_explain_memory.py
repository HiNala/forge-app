"""BP-02: design-memory explain bullets respect forge_apply_memory (read path)."""

from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.services.memory.context_explain import memory_explanation_bullets


@pytest.mark.asyncio
async def test_memory_explanation_empty_when_apply_memory_false():
    """Skip DB reads when prefs disable applying memory."""
    mock_db = MagicMock()
    out = await memory_explanation_bullets(
        mock_db,
        organization_id=uuid4(),
        user_id=uuid4(),
        apply_memory=False,
    )
    assert out == []
    mock_db.execute.assert_not_called()
