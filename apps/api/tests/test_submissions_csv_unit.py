"""Pure CSV helper — no database."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.services.submissions_csv import iter_submission_csv_rows


def test_iter_submission_csv_includes_payload_columns() -> None:
    class _Row:
        def __init__(self) -> None:
            self.id = uuid.uuid4()
            self.created_at = datetime(2026, 4, 19, 12, 0, 0, tzinfo=UTC)
            self.status = "new"
            self.submitter_email = "a@b.com"
            self.submitter_name = "Ann"
            self.payload = {"message": "Hello", "extra": "1"}

    chunks = list(iter_submission_csv_rows([_Row()]))
    text = b"".join(chunks).decode("utf-8")
    assert "submission_id" in text
    assert "message" in text
    assert "extra" in text
    assert "Hello" in text
    assert "Ann" in text
