"""Structural diff + region validation for canvas/O-03 trees (AL-03)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass
class Violation:
    path: str
    kind: str
    message: str


ScopeKind = Literal["element", "region", "screen"]


def _walk_leaves(tree: Any, prefix: str) -> dict[str, Any]:
    """Map dotted paths to primitive leaves."""
    paths: dict[str, Any] = {}
    if isinstance(tree, dict):
        for k, v in tree.items():
            pk = f"{prefix}.{k}" if prefix else str(k)
            if isinstance(v, (dict, list)):
                paths.update(_walk_leaves(v, pk))
            else:
                paths[pk] = v
    elif isinstance(tree, list):
        for i, v in enumerate(tree):
            pk = f"{prefix}[{i}]"
            if isinstance(v, (dict, list)):
                paths.update(_walk_leaves(v, pk))
            else:
                paths[pk] = v
    elif prefix:
        paths[prefix] = tree
    return paths


@dataclass
class DiffResult:
    added: list[str] = field(default_factory=list)
    removed: list[str] = field(default_factory=list)
    modified: list[tuple[str, Any, Any]] = field(default_factory=list)
    unchanged: list[str] = field(default_factory=list)


def diff_component_trees(orig: dict[str, Any] | None, refined: dict[str, Any] | None) -> DiffResult:
    """Compare two component trees flattened to primitive leaves."""
    a = _walk_leaves(orig or {}, "")
    b = _walk_leaves(refined or {}, "")
    ak, bk = set(a), set(b)
    out = DiffResult()
    for p in sorted(ak - bk):
        out.removed.append(p)
    for p in sorted(bk - ak):
        out.added.append(p)
    for p in sorted(ak & bk):
        if a[p] != b[p]:
            out.modified.append((p, a[p], b[p]))
        else:
            out.unchanged.append(p)
    return out


def _find_roots_for_reference(tree: Any, ref: str) -> list[str]:
    """Return JSON paths pointing at subtrees whose id fields match ``ref``."""
    roots: list[str] = []

    def visit(node: Any, pfx: str) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                npfx = f"{pfx}.{k}" if pfx else k
                if (
                    k in {"id", "node_id", "element_id", "forge_id"}
                    and isinstance(v, str)
                    and v.strip() == ref
                ):
                    roots.append(pfx or "root")
                visit(v, npfx)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                visit(v, f"{pfx}[{i}]")

    visit(tree or {}, "")
    return roots


def _path_allowed(path: str, roots: list[str]) -> bool:
    return any(path == r or path.startswith(r + ".") or path.startswith(r + "[") for r in roots)


def validate_region_edit(
    original_tree: dict[str, Any] | None,
    refined_tree: dict[str, Any] | None,
    *,
    scope: ScopeKind,
    element_ref: str | None,
) -> list[Violation]:
    """When ``scope=='element``', flag changes whose paths are not rooted at ``element_ref``."""
    diff = diff_component_trees(original_tree, refined_tree)

    if scope == "screen":
        return []

    if scope == "region":
        # UX-level region boxes need HTML hashing; defer to ``region_hash`` when no tree fidelity.
        return []

    ef = (element_ref or "").strip()
    if not ef:
        return [
            Violation(
                path="*",
                kind="missing_scope",
                message="Region edit with element scope requires element_ref.",
            )
        ]

    roots = _find_roots_for_reference(original_tree, ef)
    if not roots:
        return [
            Violation(
                path="*",
                kind="missing_element_binding",
                message=f"No component node references '{ef}' — cannot lock edits.",
            )
        ]

    violations: list[Violation] = []
    touched = [*diff.removed, *diff.added, *[p for p, _, __ in diff.modified]]
    for path in touched:
        if _path_allowed(path, roots):
            continue
        violations.append(
            Violation(
                path=path,
                kind="out_of_scope",
                message="Change is outside the selected element subtree.",
            )
        )
    return violations


def diff_trees_full(original_tree: dict[str, Any] | None, refined_tree: dict[str, Any] | None) -> DiffResult:
    """Public alias — same as :func:`diff_component_trees`."""
    return diff_component_trees(original_tree, refined_tree)
