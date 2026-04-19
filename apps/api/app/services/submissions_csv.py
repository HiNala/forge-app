"""Stream submissions as CSV (Mission 04 Phase 8)."""

from __future__ import annotations

import csv
import io
from collections.abc import Iterator, Sequence
from datetime import UTC

from app.db.models.submission import Submission


def iter_submission_csv_rows(rows: Sequence[Submission]) -> Iterator[bytes]:
    """
    Yield UTF-8 encoded CSV chunks: one header row, then one data row per submission.

    Rows should be ordered (e.g. oldest first). Payload keys are unioned across rows.
    """
    payload_keys: set[str] = set()
    for s in rows:
        payload_keys.update(str(k) for k in s.payload)
    extra = sorted(payload_keys)
    header = [
        "submission_id",
        "created_at",
        "status",
        "submitter_email",
        "submitter_name",
        *extra,
    ]

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    yield buf.getvalue().encode("utf-8")

    for s in rows:
        buf2 = io.StringIO()
        w2 = csv.writer(buf2)
        created = s.created_at
        if created.tzinfo is not None:
            created = created.astimezone(UTC)
        created_s = created.replace(tzinfo=None).isoformat(timespec="seconds") + "Z"
        row_vals: list[str] = [
            str(s.id),
            created_s,
            s.status,
            s.submitter_email or "",
            s.submitter_name or "",
        ]
        for k in extra:
            v = s.payload.get(k)
            row_vals.append("" if v is None else str(v))
        w2.writerow(row_vals)
        yield buf2.getvalue().encode("utf-8")
