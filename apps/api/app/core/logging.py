"""Structured logging (structlog). JSON in production, console in development."""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog

from app.config import settings
from app.core.context import try_get_request_context


def _merge_request_ctx(
    logger: object, method_name: str, event_dict: dict[str, object]
) -> dict[str, object]:
    ctx = try_get_request_context()
    if ctx is not None:
        if ctx.user_id is not None:
            event_dict.setdefault("user_id", str(ctx.user_id))
        if ctx.organization_id is not None:
            event_dict.setdefault("organization_id", str(ctx.organization_id))
    return event_dict


def configure_logging() -> None:
    """Idempotent: safe to call from ``FastAPI`` lifespan or import time."""
    is_dev = settings.ENVIRONMENT in ("development", "local", "test")
    processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        _merge_request_ctx,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
    ]
    if is_dev:
        processors.extend(
            [
                structlog.dev.set_exc_info,
                structlog.processors.TimeStamper(fmt="%H:%M:%S", utc=False),
                structlog.dev.ConsoleRenderer(colors=True),
            ]
        )
    else:
        processors.extend(
            [
                structlog.processors.format_exc_info,
                structlog.processors.TimeStamper(fmt="iso", utc=True),
                structlog.processors.JSONRenderer(),
            ]
        )

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout)


def get_logger(name: str | None = None) -> Any:
    """Return structlog logger (typing varies by structlog version)."""
    return structlog.get_logger(name)
