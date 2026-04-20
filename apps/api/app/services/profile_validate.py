"""Display name and timezone validation (BI-04)."""

from __future__ import annotations

from zoneinfo import ZoneInfo, available_timezones

# Minimal reserved list — extend with product policy.
_RESERVED_DISPLAY_TERMS = frozenset(
    {
        "admin",
        "administrator",
        "forge",
        "support",
        "system",
        "root",
        "null",
        "undefined",
    }
)


def validate_display_name(name: str) -> None:
    from fastapi import HTTPException

    n = name.strip()
    if len(n) < 1:
        raise HTTPException(status_code=400, detail="display_name cannot be empty")
    if len(n) > 120:
        raise HTTPException(status_code=400, detail="display_name too long")
    low = n.lower()
    for term in _RESERVED_DISPLAY_TERMS:
        if low == term or low.startswith(f"{term} ") or low.endswith(f" {term}"):
            raise HTTPException(status_code=400, detail="display_name uses a reserved term")


def validate_timezone_iana(tz: str) -> None:
    """Validate IANA timezone name (e.g. America/Los_Angeles)."""
    from fastapi import HTTPException

    t = tz.strip()
    if not t:
        raise HTTPException(status_code=400, detail="timezone cannot be empty")
    if t not in available_timezones():
        raise HTTPException(status_code=400, detail="invalid IANA timezone")
    try:
        ZoneInfo(t)
    except Exception as e:
        raise HTTPException(status_code=400, detail="invalid timezone") from e
