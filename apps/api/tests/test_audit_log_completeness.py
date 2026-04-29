"""AL-04 — Sanity check that audited surfaces include expected action strings."""

from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[3]


def test_canvas_audit_actions_present_on_disk() -> None:
    txt = (REPO / "apps/api/app/api/v1/canvas.py").read_text(encoding="utf-8")
    for needle in (
        '"canvas_project_created"',
        '"canvas_screen_created"',
        '"canvas_screen_deleted"',
        '"canvas_screen_refined"',
        '"canvas_project_published"',
        '"canvas_export_',
        "write_audit",
    ):
        assert needle in txt


def test_billing_exports_write_audit() -> None:
    txt = (REPO / "apps/api/app/api/v1/billing.py").read_text(encoding="utf-8")
    assert 'write_audit' in txt
    assert '"extra_usage_cap_updated"' in txt
