"""Merge org_settings JSON with defaults."""

from __future__ import annotations

from typing import Any

from app.schemas.org_settings_full import OrgSettings, OrgSettingsPartial


def merged_org_settings(raw: dict[str, Any] | None) -> OrgSettings:
    base = OrgSettings().model_dump(mode="json")
    if not raw:
        return OrgSettings.model_validate(base)
    merged = {**base, **raw}
    # Deep-merge sub-keys when present
    for key in ("defaults", "notifications", "security", "data_retention"):
        if isinstance(raw.get(key), dict) and isinstance(base.get(key), dict):
            merged[key] = {**base[key], **raw[key]}
    return OrgSettings.model_validate(merged)


def apply_org_partial(
    current: dict[str, Any] | None, partial: OrgSettingsPartial
) -> dict[str, Any]:
    full = merged_org_settings(current).model_dump(mode="json")
    patch = partial.model_dump(exclude_unset=True)
    for k, v in patch.items():
        if v is None:
            continue
        if isinstance(v, dict) and isinstance(full.get(k), dict):
            full[k] = {**full[k], **v}
        else:
            full[k] = v
    return OrgSettings.model_validate(full).model_dump(mode="json")
