#!/usr/bin/env python3
"""Write FastAPI OpenAPI JSON to stdout or a file (BI-02 / CI)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> None:
    p = argparse.ArgumentParser(description="Export OpenAPI schema from the Forge API app.")
    p.add_argument(
        "out",
        nargs="?",
        default="-",
        help="Output path (default: stdout)",
    )
    args = p.parse_args()
    from app.main import app  # noqa: PLC0415

    spec = app.openapi()
    text = json.dumps(spec, indent=2, ensure_ascii=False) + "\n"
    if args.out == "-":
        sys.stdout.write(text)
    else:
        Path(args.out).write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
