"""Sentry SDK wiring (BI-02) — scrub secrets; tag org + request id."""

from __future__ import annotations

import re
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.config import settings

_SENSITIVE_KEY = re.compile(r"(password|secret|token|authorization|cookie|api[_-]?key)", re.I)


def init_sentry() -> None:
    dsn = (settings.SENTRY_DSN or "").strip()
    if not dsn:
        return

    def before_send(event: Any, _hint: dict[str, Any]) -> Any:
        if isinstance(event, dict) and "request" in event and isinstance(event["request"], dict):
            headers = event["request"].get("headers")
            if isinstance(headers, dict):
                for k in list(headers.keys()):
                    if _SENSITIVE_KEY.search(k):
                        headers[k] = "[Filtered]"
        return event

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
