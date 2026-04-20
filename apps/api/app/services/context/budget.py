"""Time-bounded asyncio gather (Mission O-01)."""

from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


async def wait_with_budget(
    tasks: dict[str, asyncio.Task[Any]],
    *,
    budget_seconds: float,
) -> dict[str, Any]:
    """Return results for completed tasks; cancel the rest; exceptions → None."""
    if not tasks:
        return {}
    pending = set(tasks.values())
    loop = asyncio.get_event_loop()
    t0 = loop.time()
    done, pending_set = await asyncio.wait(
        pending,
        timeout=budget_seconds,
        return_when=asyncio.ALL_COMPLETED,
    )
    out: dict[str, Any] = {}
    for name, t in tasks.items():
        if t in done:
            try:
                out[name] = t.result()
            except Exception as e:
                logger.warning("context.task_error %s %s", name, e)
                out[name] = None
        else:
            t.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await t
            out[name] = None
    elapsed = loop.time() - t0
    if pending_set:
        logger.info("context.budget_cancelled pending=%s elapsed=%.2fs", len(pending_set), elapsed)
    return out


async def with_timeout(coro: Any, seconds: float, label: str) -> Any:
    try:
        return await asyncio.wait_for(coro, timeout=seconds)
    except TimeoutError:
        logger.debug("context.timeout %s", label)
        return None
    except Exception as e:
        logger.warning("context.error %s %s", label, e)
        return None
