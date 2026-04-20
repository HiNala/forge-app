"""Feature flag defaults; org overrides win (BI-04)."""

from __future__ import annotations

import time
from uuid import UUID

from sqlalchemy import select

from app.db.models import OrgFeatureFlag
from app.db.session import AsyncSessionLocal

DEFAULT_FLAGS: dict[str, bool] = {
    "pitch_deck_workflow": False,
    "calendar_v2": False,
}

_FLAG_CACHE: dict[str, tuple[float, bool]] = {}
_FLAG_TTL_SEC = 60.0


async def is_enabled(organization_id: UUID, flag: str) -> bool:
    """Return effective flag value for an org; defaults from :data:`DEFAULT_FLAGS`. Cached ~60s."""
    default = DEFAULT_FLAGS.get(flag, False)
    key = f"{organization_id}:{flag}"
    now = time.monotonic()
    cached = _FLAG_CACHE.get(key)
    if cached is not None and (now - cached[0]) < _FLAG_TTL_SEC:
        return cached[1]

    async with AsyncSessionLocal() as session:
        row = (
            await session.execute(
                select(OrgFeatureFlag).where(
                    OrgFeatureFlag.organization_id == organization_id,
                    OrgFeatureFlag.flag == flag,
                )
            )
        ).scalar_one_or_none()
    out = bool(row.enabled) if row is not None else default
    _FLAG_CACHE[key] = (now, out)
    return out


def bust_flag_cache(organization_id: UUID, flag: str | None = None) -> None:
    """Call after changing org overrides (tests or admin API)."""
    if flag is None:
        to_drop = [k for k in _FLAG_CACHE if k.startswith(f"{organization_id}:")]
        for k in to_drop:
            _FLAG_CACHE.pop(k, None)
    else:
        _FLAG_CACHE.pop(f"{organization_id}:{flag}", None)
