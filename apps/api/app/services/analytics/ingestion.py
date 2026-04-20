"""Async batch ingestion into ``analytics_events`` (GL-01)."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
import uuid
from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from prometheus_client import Counter
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models.analytics_event import AnalyticsEvent
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

ANALYTICS_BACKPRESSURE_DROPS = Counter(
    "analytics_backpressure_drop_total",
    "Events dropped because ingestion queue was full",
)
ANALYTICS_BATCH_FLUSH = Counter(
    "analytics_batch_flush_total",
    "Ingestion batches written",
)

_MAX_QUEUE = 5000
_MAX_BATCH = 500
_FLUSH_INTERVAL_SEC = 1.0

_queue: asyncio.Queue[dict[str, Any]] | None = None
_shutdown = asyncio.Event()
_consumer_task: asyncio.Task[None] | None = None


def _get_queue() -> asyncio.Queue[dict[str, Any]]:
    global _queue
    if _queue is None:
        _queue = asyncio.Queue(_MAX_QUEUE + 10)
    return _queue


def enqueue_event_row(row: dict[str, Any]) -> None:
    """Enqueue one row (non-blocking). Drops oldest on overflow."""
    q = _get_queue()
    if q.qsize() >= _MAX_QUEUE:
        try:
            q.get_nowait()
            ANALYTICS_BACKPRESSURE_DROPS.inc()
            logger.warning("analytics ingestion queue full; dropped oldest event")
        except asyncio.QueueEmpty:
            pass
    try:
        q.put_nowait(row)
    except asyncio.QueueFull:
        ANALYTICS_BACKPRESSURE_DROPS.inc()


async def enqueue_event_row_sync(row: dict[str, Any]) -> None:
    """Used in tests — immediate single-row insert."""
    async with AsyncSessionLocal() as db:
        await _flush_rows(db, [row])
        await db.commit()


def start_consumer() -> asyncio.Task[None] | None:
    global _consumer_task
    if _consumer_task is not None and not _consumer_task.done():
        return _consumer_task
    _shutdown.clear()
    _consumer_task = asyncio.create_task(_consumer_loop())
    return _consumer_task


async def shutdown_consumer() -> None:
    global _consumer_task
    _shutdown.set()
    if _consumer_task is not None:
        _consumer_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _consumer_task
        _consumer_task = None


async def _consumer_loop() -> None:
    q = _get_queue()
    while not _shutdown.is_set():
        try:
            first = await asyncio.wait_for(q.get(), timeout=0.5)
        except TimeoutError:
            continue
        batch = [first]
        deadline = time.monotonic() + _FLUSH_INTERVAL_SEC
        while len(batch) < _MAX_BATCH and time.monotonic() < deadline:
            try:
                batch.append(q.get_nowait())
            except asyncio.QueueEmpty:
                await asyncio.sleep(0.02)
        try:
            async with AsyncSessionLocal() as db:
                await _flush_rows(db, batch)
                await db.commit()
            ANALYTICS_BATCH_FLUSH.inc()
        except Exception as e:  # noqa: BLE001
            logger.exception("analytics batch flush failed: %s", e)


async def _flush_rows(db: AsyncSession, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    await db.execute(insert(AnalyticsEvent), rows)


def row_from_parts(
    *,
    organization_id: uuid.UUID,
    page_id: uuid.UUID | None,
    event_type: str,
    visitor_id: str,
    session_id: str,
    metadata: dict[str, Any] | None,
    source_ip: Any,
    user_agent: str | None,
    referrer: str | None,
    created_at: datetime,
    user_id: UUID | None = None,
    event_source: str | None = None,
    workflow: str | None = None,
    surface: str | None = None,
    referrer_domain: str | None = None,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    utm_content: str | None = None,
    utm_term: str | None = None,
    browser: str | None = None,
    os: str | None = None,
    device_model: str | None = None,
    viewport_width: int | None = None,
    viewport_height: int | None = None,
    locale: str | None = None,
    timezone: str | None = None,
    country_code: str | None = None,
    experiment_arm: Mapping[str, Any] | None = None,
    feature_flags: Mapping[str, Any] | None = None,
    client_event_id: str | None = None,
    received_at: datetime | None = None,
    row_id: UUID | None = None,
) -> dict[str, Any]:
    eid = row_id or uuid.uuid4()
    recv = received_at or datetime.now(UTC)
    return {
        "id": eid,
        "organization_id": organization_id,
        "page_id": page_id,
        "event_type": event_type[:200],
        "visitor_id": visitor_id[:500],
        "session_id": session_id[:500],
        "metadata": metadata,
        "source_ip": source_ip,
        "user_agent": user_agent,
        "referrer": referrer,
        "created_at": created_at,
        "user_id": user_id,
        "event_source": event_source,
        "workflow": workflow,
        "surface": surface,
        "referrer_domain": referrer_domain,
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "utm_content": utm_content,
        "utm_term": utm_term,
        "browser": browser,
        "os": os,
        "device_model": device_model,
        "viewport_width": viewport_width,
        "viewport_height": viewport_height,
        "locale": locale,
        "timezone": timezone,
        "country_code": country_code,
        "experiment_arm": dict(experiment_arm or {}),
        "feature_flags": dict(feature_flags or {}),
        "client_event_id": (client_event_id[:200] if client_event_id else None),
        "received_at": recv,
    }


def flush_policy_immediate() -> bool:
    """Tests run without background consumer — insert synchronously."""
    return settings.ENVIRONMENT == "test"
