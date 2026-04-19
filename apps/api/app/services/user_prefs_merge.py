"""Merge persisted JSON with Pydantic defaults."""

from __future__ import annotations

from typing import Any

from app.schemas.user_preferences_full import UserPreferences, UserPreferencesPartial


def deep_merge_notifications(
    base: dict[str, Any],
    patch: dict[str, Any] | None,
) -> dict[str, Any]:
    if not patch:
        return base
    n_in: dict[str, Any] = (
        dict(base["notifications"]) if isinstance(base.get("notifications"), dict) else {}
    )
    n_patch = patch.get("notifications")
    if isinstance(n_patch, dict):
        n_in = {**n_in, **{k: v for k, v in n_patch.items() if v is not None}}
        base = {**base, "notifications": n_in}
        patch = {k: v for k, v in patch.items() if k != "notifications"}
    tail: dict[str, Any] = {}
    for k, v in patch.items():
        if v is not None:
            tail[k] = v
    return {**base, **tail}


def merged_user_preferences(raw: dict[str, Any] | None) -> UserPreferences:
    defaults = UserPreferences().model_dump(mode="json")
    merged = deep_merge_notifications(defaults, dict(raw or {}))
    # Second pass: validate nested notifications
    if isinstance(merged.get("notifications"), dict):
        un = UserPreferences().notifications.model_dump()
        merged["notifications"] = {**un, **merged["notifications"]}
    return UserPreferences.model_validate(merged)


def preference_diff(
    before: dict[str, Any],
    after: dict[str, Any],
) -> dict[str, list[Any]]:
    """Flat-ish diff for audit: only keys that changed."""
    changes: dict[str, list[Any]] = {}
    for key in set(before) | set(after):
        if before.get(key) != after.get(key):
            changes[key] = [before.get(key), after.get(key)]
    return changes


def apply_partial_update(
    current_raw: dict[str, Any] | None,
    partial: UserPreferencesPartial,
) -> dict[str, Any]:
    merged = merged_user_preferences(current_raw).model_dump(mode="json")
    patch = partial.model_dump(exclude_unset=True)
    if "notifications" in patch and isinstance(patch["notifications"], dict):
        m = merged.get("notifications") or {}
        merged["notifications"] = {**m, **patch["notifications"]}
        del patch["notifications"]
    merged = {**merged, **patch}
    return UserPreferences.model_validate(merged).model_dump(mode="json")
