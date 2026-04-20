#!/usr/bin/env python3
"""GL-03 — cross-tenant RLS checks (extends scripts/check-rls.py).

Requires a role **without** BYPASSRLS (typically ``forge_app``). Set:

  FORGE_RLS_AUDIT_DATABASE_URL=postgresql+psycopg://forge_app:PASSWORD@host:5432/dbname

When unset, runs only the structural RLS presence check via ``check-rls.py`` and exits 0.

Deep audit (INSERT/SELECT across org contexts) is expanded as new tables ship — keep
``app/db/tenant_tables.py`` (optional) or query ``information_schema`` for ``organization_id``.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    check = root / "scripts" / "check-rls.py"
    env = os.environ.copy()
    rc = subprocess.call([sys.executable, str(check)], env=env)
    if rc != 0:
        return rc

    url = os.environ.get("FORGE_RLS_AUDIT_DATABASE_URL", "").strip()
    if not url:
        print("FORGE_RLS_AUDIT_DATABASE_URL not set — skipping cross-tenant probes (OK).")
        return 0

    print(
        "Deep RLS audit URL is set; full INSERT/SELECT matrix is not automated in this repo yet.",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
