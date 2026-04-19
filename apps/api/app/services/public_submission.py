"""Public form accept — validate payload, anonymize IP (Mission 04)."""

from __future__ import annotations

import hashlib
import ipaddress
from typing import Any


def validate_payload_against_form_schema(
    form_schema: dict[str, Any] | None,
    payload: dict[str, Any],
) -> tuple[bool, str]:
    """If ``form_schema`` lists ``required`` field names, ensure they are present."""
    if not form_schema:
        return True, ""
    req = form_schema.get("required")
    if not isinstance(req, list):
        return True, ""
    for key in req:
        if isinstance(key, str) and key.startswith("__"):
            continue
        if key not in payload:
            return False, f"Missing field: {key}"
        val = payload[key]
        if val is None or (isinstance(val, str) and not val.strip()):
            return False, f"Invalid field: {key}"
    return True, ""


def anonymize_ipv4_to_slash24(raw_ip: str) -> str | None:
    """Map IPv4 to its /24 network address string for GDPR-style storage."""
    s = raw_ip.strip().split(",")[0].strip().removeprefix("::ffff:")
    try:
        a = ipaddress.ip_address(s.split("%")[0])
    except ValueError:
        return None
    if isinstance(a, ipaddress.IPv4Address):
        o = a.packed[:3]
        return f"{o[0]}.{o[1]}.{o[2]}.0"
    return None


def visitor_fingerprint(ip: str, user_agent: str | None) -> str:
    """Stable anonymous id for analytics (not reversible to identity)."""
    h = hashlib.sha256(f"{ip}|{user_agent or ''}".encode())
    return h.hexdigest()[:32]


def normalize_submit_fields(raw: dict[str, Any]) -> tuple[str | None, str | None, dict[str, Any]]:
    """Split email/name from field payload (JSON or flattened form)."""
    data = dict(raw)
    # Booking workflow internals (W-01) — not part of visitor message fields.
    for _k in ("hold_id", "forge_hold_id"):
        data.pop(_k, None)
    email = data.pop("email", None) or data.pop("emailAddress", None)
    if email is not None and not isinstance(email, str):
        email = str(email)
    name = data.pop("name", None) or data.pop("full_name", None)
    if name is not None and not isinstance(name, str):
        name = str(name)
    nested = data.pop("payload", None)
    payload = {**nested, **data} if isinstance(nested, dict) else data
    out: dict[str, Any] = {}
    for k, v in payload.items():
        out[str(k)] = _jsonable(v)
    return email, name, out


def _jsonable(v: Any) -> Any:
    if isinstance(v, dict):
        return {str(kk): _jsonable(vv) for kk, vv in v.items()}
    if isinstance(v, list):
        return [_jsonable(x) for x in v]
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    return str(v)
