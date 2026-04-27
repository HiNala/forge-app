"""Load LLM routes from DB + Redis cache bump (V2 P-05)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any
from uuid import UUID

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.llm_routing_policy import LlmRoutingPolicy

if TYPE_CHECKING:
    from app.services.llm.llm_router import ModelRoute

logger = logging.getLogger(__name__)

ROUTING_REDIS_KEY = "forge:llm_routing:version"

_route_cache: dict[str, Any] = {}


def _ck(rver: int, org: UUID | None, role: str) -> str:
    return f"{rver}|{org or 'p'}|{role}"


async def bump_routing_version(redis: Redis | None) -> int:
    if redis is None:
        return 0
    try:
        v = await redis.incr(ROUTING_REDIS_KEY)
        await redis.publish("forge:llm_routing:invalidate", str(v))
        return int(v)
    except Exception as e:  # noqa: BLE001
        logger.warning("routing_version_bump %s", e)
        return 0


async def _load_org_policies(
    db: AsyncSession,
    org_id: UUID | None,
) -> dict[str, LlmRoutingPolicy]:
    q = select(LlmRoutingPolicy).where(LlmRoutingPolicy.organization_id.is_(None))
    plat = (await db.execute(q)).scalars().all()
    out: dict[str, LlmRoutingPolicy] = {p.role: p for p in plat}
    if org_id is not None:
        q2 = select(LlmRoutingPolicy).where(LlmRoutingPolicy.organization_id == org_id)
        for row in (await db.execute(q2)).scalars().all():
            out[row.role] = row
    return out


def _row_to_model_route(row: LlmRoutingPolicy) -> "ModelRoute":
    from app.services.llm.llm_router import ROUTES, ModelRoute

    fbs: list[tuple[str, str]] = []
    raw = row.fallbacks or []
    for item in raw:
        if isinstance(item, dict) and "provider" in item and "model" in item:
            fbs.append((str(item["provider"]), str(item["model"])))
    return ModelRoute(
        role=row.role,
        primary=(row.primary_provider, row.primary_model),
        fallbacks=fbs,
        temperature=ROUTES.get(row.role, ROUTES["composer"]).temperature,
        max_tokens=ROUTES.get(row.role, ROUTES["composer"]).max_tokens,
    )


async def effective_model_route(
    db: AsyncSession | None,
    redis: Redis | None,
    *,
    role: str,
    organization_id: UUID | None,
) -> "ModelRoute":
    """
    DB policies override in-process ROUTES; org rows override platform rows.
    When DB empty, return built-in ROUTES.
    """
    from app.services.llm.llm_router import ROUTES

    rver = 0
    if redis is not None:
        try:
            raw = await redis.get(ROUTING_REDIS_KEY)
            rver = int(raw) if raw is not None else 0
        except Exception:  # noqa: BLE001
            rver = 0
    key = _ck(rver, organization_id, role)
    if key in _route_cache:
        return _route_cache[key]

    if db is None:
        r = ROUTES[role]
        _route_cache[key] = r
        return r

    try:
        policies = await _load_org_policies(db, organization_id)
    except Exception as e:  # noqa: BLE001
        logger.warning("load_routing_policies %s", e)
        r = ROUTES[role]
        _route_cache[key] = r
        return r

    if role not in policies:
        route = ROUTES[role]
    else:
        route = _row_to_model_route(policies[role])
    if len(_route_cache) > 2000:
        _route_cache.clear()
    _route_cache[key] = route
    return route
