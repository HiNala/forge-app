#!/usr/bin/env python3
"""GL-03 — large-scale test corpus seed (placeholder CLI).

Future: create many orgs/pages/submissions via async batch inserts for load-test baselines.
Run: ``uv run python scripts/seed_test_corpus.py`` from ``apps/api`` with ``DATABASE_URL`` set.
"""

from __future__ import annotations


def main() -> int:
    print("seed_test_corpus: not implemented — add batch inserts + faker when staging load DB is available.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
