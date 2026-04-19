"""Alembic health — single linear head.

Full downgrade base → upgrade round-trip runs in CI (see ``.github/workflows/ci.yml``).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

_api_root = Path(__file__).resolve().parents[1]


def test_alembic_single_linear_head() -> None:
    """Fail if migration branches diverge (multiple heads)."""
    env = os.environ.copy()
    env.setdefault("PYTHONPATH", str(_api_root))
    r = subprocess.run(
        [sys.executable, "-m", "alembic", "heads"],
        cwd=_api_root,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    assert r.returncode == 0, r.stderr
    lines = [ln.strip() for ln in r.stdout.splitlines() if "(head)" in ln]
    assert len(lines) == 1, f"expected exactly one Alembic head, got: {r.stdout!r}"
