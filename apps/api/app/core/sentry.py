"""Sentry SDK wiring (BI-02) — scrub secrets; tag org + request id."""

from __future__ import annotations

import re
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.config import settings

_SENSITIVE_KEY = re.compile(r"(password|secret|token|authorization|cookie|jwt|api[_-]?key|bearer)", re.I)


def scrub_sentry_event(event: Any, _hint: dict[str, Any] | None = None) -> Any:
    """Redact structured fields before outbound Sentry; safe to unit-test."""

    def key_sensitive(key: str) -> bool:
        return bool(_SENSITIVE_KEY.search(key))

    def walk(obj: Any) -> Any:
        if isinstance(obj, dict):
            out: dict[str, Any] = {}
            for k, v in obj.items():
                if key_sensitive(str(k)):
                    out[k] = "[Filtered]"
                else:
                    out[k] = walk(v)
            return out
        if isinstance(obj, list):
            return [walk(i) for i in obj]
        return obj

    if not isinstance(event, dict):
        return event
    return walk(event)


def init_sentry() -> None:
    dsn = (settings.SENTRY_DSN or "").strip()
    if not dsn:
        return

    def before_send(event: Any, hint: dict[str, Any]) -> Any:
        return scrub_sentry_event(event, hint)

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.ENVIRONMENT,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
        ],
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
        before_send=before_send,
    )
