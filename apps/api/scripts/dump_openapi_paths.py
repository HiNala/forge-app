"""One-off helper: print OpenAPI paths by tag for docs (BI-03)."""

from __future__ import annotations

from collections import defaultdict

from app.main import app


def main() -> None:
    spec = app.openapi()
    by_tag: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for path, methods in spec.get("paths", {}).items():
        for m, op in methods.items():
            if m.startswith("x-"):
                continue
            summary = (op.get("summary") or "")[:80]
            for t in op.get("tags") or ["untagged"]:
                by_tag[t].append((m.upper(), path, summary))
    for t in sorted(by_tag):
        print(f"## {t}\n")
        for method, path, summary in sorted(by_tag[t], key=lambda x: (x[1], x[0])):
            print(f"- `{method} {path}` - {summary}")
        print()


if __name__ == "__main__":
    main()
