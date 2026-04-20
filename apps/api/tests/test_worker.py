"""BI-03 — arq worker module loads and settings match docs/runbooks/WORKER.md."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


def _load_worker_module():
    """Load ``apps/worker/worker.py`` as a module (same code path as Docker worker)."""
    root = Path(__file__).resolve().parents[2]  # .../apps
    wp = root / "worker" / "worker.py"
    assert wp.is_file(), f"missing worker entrypoint at {wp}"
    spec = importlib.util.spec_from_file_location("forge_arq_worker", wp)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_worker_settings_match_runbook() -> None:
    mod = _load_worker_module()
    ws = mod.WorkerSettings
    assert ws.max_jobs == 20
    assert ws.job_timeout == 120
    assert ws.keep_result == 3600
    assert ws.poll_delay == 0.5
    names = {f.__name__ for f in ws.functions}
    assert "run_automations" in names
    assert "purge_deleted_user" in names
    cron_names = {c.coroutine.__name__ for c in ws.cron_jobs}
    assert "partman_maintenance" in cron_names
    assert "refresh_retention_views" in cron_names


@pytest.mark.asyncio
async def test_partman_maintenance_soft_noop_without_partman() -> None:
    mod = _load_worker_module()
    # Should not raise even when pg_partman is absent (catches Exception).
    await mod.partman_maintenance({})
