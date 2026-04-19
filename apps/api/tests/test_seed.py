"""Dev seed idempotency (BI-01)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

_api_root = Path(__file__).resolve().parents[1]


@pytest.mark.asyncio
async def test_seed_dev_is_idempotent() -> None:
    from tests.support.postgres import require_postgres

    await require_postgres()
    env = os.environ.copy()
    env.setdefault("PYTHONPATH", str(_api_root))
    for _ in range(2):
        r = subprocess.run(
            [sys.executable, "scripts/seed_dev.py"],
            cwd=_api_root,
            capture_output=True,
            text=True,
            check=False,
            env=env,
        )
        assert r.returncode == 0, r.stderr or r.stdout
