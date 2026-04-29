"""Client + server evaluation of per-field ``show_if`` (P-08).

Schema shape (TypeScript names in docs; JSON-compatible here):

* ``ShowIf`` may contain ``all`` (AND), ``any`` (OR), and ``not`` (single condition tree).
* ``ShowIfCondition``: ``field``, ``op``, optional ``value``.
"""

from __future__ import annotations

import logging
from collections.abc import Mapping
from typing import Any

logger = logging.getLogger(__name__)

_OPS = frozenset(
    {
        "eq",
        "neq",
        "gt",
        "lt",
        "gte",
        "lte",
        "in",
        "nin",
        "contains",
        "empty",
        "not_empty",
    }
)


def _get_field(payload: Mapping[str, Any], field: str) -> Any:
    if field in payload:
        return payload[field]
    if "." in field:
        cur: Any = dict(payload)
        for part in field.split("."):
            if not isinstance(cur, dict) or part not in cur:
                return None
            cur = cur[part]
        return cur
    return None


def _is_empty(v: Any) -> bool:
    if v is None:
        return True
    return bool(isinstance(v, str) and not v.strip())


def _eval_condition(payload: Mapping[str, Any], c: Any) -> bool:
    if not isinstance(c, dict):
        return True
    op = c.get("op")
    if op in ("all", "any", "not") or "all" in c or "any" in c or "not" in c:
        return _eval_tree(payload, c)
    if op not in _OPS:
        return True
    field = c.get("field")
    if not isinstance(field, str) or not field:
        return True
    value = c.get("value", None)
    left = _get_field(payload, field)
    if op == "empty":
        return _is_empty(left)
    if op == "not_empty":
        return not _is_empty(left)
    if op == "eq":
        return bool(left == value)
    if op == "neq":
        return bool(left != value)
    if op in ("gt", "lt", "gte", "lte"):
        try:
            if value is None:
                return False
            ln = float(left)
            rn = float(value)
        except (TypeError, ValueError):
            return False
        if op == "gt":
            return ln > rn
        if op == "lt":
            return ln < rn
        if op == "gte":
            return ln >= rn
        return ln <= rn
    if op == "in":
        return isinstance(value, (list, tuple, set, frozenset)) and left in value
    if op == "nin":
        return isinstance(value, (list, tuple, set, frozenset)) and left not in value
    if op == "contains":
        if left is None:
            return False
        return str(value) in str(left) if value is not None else False
    return True


def _eval_tree(payload: Mapping[str, Any], node: Any) -> bool:
    if not isinstance(node, dict):
        return True
    if "all" in node and isinstance(node["all"], list):
        return all(_eval_condition(payload, x) for x in node["all"])
    if "any" in node and isinstance(node["any"], list):
        return any(_eval_condition(payload, x) for x in node["any"])
    if "not" in node:
        return not _eval_tree(payload, node["not"])
    return _eval_condition(payload, node)


def field_is_visible(
    form_schema: dict[str, Any] | None,
    field_name: str,
    payload: Mapping[str, Any],
) -> bool:
    """A named field is visible if it has no ``show_if`` or the rule evaluates true."""
    if not form_schema:
        return True
    fields = form_schema.get("fields")
    if not isinstance(fields, list):
        return True
    for f in fields:
        if not isinstance(f, dict):
            continue
        if f.get("name") != field_name:
            continue
        rule = f.get("show_if")
        if rule in (None, {}):
            return True
        try:
            return _eval_tree(payload, rule)
        except Exception:  # noqa: BLE001
            logger.exception("show_if eval failed for field %s", field_name)
            return False
    return True


def visible_field_names(
    form_schema: dict[str, Any] | None,
    payload: Mapping[str, Any],
) -> set[str] | None:
    """Set of visible field names, or ``None`` if the schema has no per-field list (no filtering)."""
    if not form_schema:
        return None
    fields = form_schema.get("fields")
    if not isinstance(fields, list) or not fields:
        return None
    out: set[str] = set()
    for f in fields:
        if not isinstance(f, dict):
            continue
        n = f.get("name")
        if not isinstance(n, str) or not n:
            continue
        if field_is_visible(form_schema, n, payload):
            out.add(n)
    return out


def validate_payload_against_form_schema_and_show_if(
    form_schema: dict[str, Any] | None,
    payload: Mapping[str, Any],
) -> tuple[bool, str]:
    """
    1) Required fields that are *visible* must be present and non-empty.
    2) No non-empty value for a field that is *not* visible.
    3) Legacy ``required`` list is intersected with visibility when ``fields`` exists.
    """
    if not form_schema:
        return True, ""

    # Build effective required: only visible fields (when we have a fields[] list)
    vis = visible_field_names(form_schema, payload)
    req = form_schema.get("required")
    if isinstance(req, list) and vis is not None:
        eff_req = [x for x in req if isinstance(x, str) and x in vis and not x.startswith("__")]
    elif isinstance(req, list):
        eff_req = [x for x in req if isinstance(x, str) and not x.startswith("__")]
    else:
        eff_req = []
    for key in eff_req:
        if key not in payload:
            return False, f"Missing field: {key}"
        val = payload[key]
        if val is None or (isinstance(val, str) and not val.strip()):
            return False, f"Invalid field: {key}"

    pay = {k: v for k, v in payload.items() if not k.startswith("__")}
    fields = form_schema.get("fields")
    if isinstance(fields, list) and fields:
        known = {
            str(f["name"])
            for f in fields
            if isinstance(f, dict) and isinstance(f.get("name"), str)
        }
        for fname, value in pay.items():
            if fname in ("email", "name", "emailAddress", "full_name", "hold_id", "forge_hold_id", "payload"):
                continue
            if fname not in known:
                continue
            if (
                not field_is_visible(form_schema, str(fname), pay)
                and value is not None
                and (not isinstance(value, str) or value.strip())
            ):
                return (
                    False,
                    f"Unexpected field for current answers: {fname}",
                )
    return True, ""
