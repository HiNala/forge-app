"""Sentry SDK initialization (BI-02)."""

from __future__ import annotations

import re
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.config import settings

_SENSITIVE_KEY = re.compile(r"(password|secret|token|authorization|cookie)", re.I)


def _scrub_event(event: dict[str, Any], _hint: dict[str, Any]) -> dict[str, Any] | None:
    req = event.get("request")
    if isinstance(req, dict):
        headers = req.get("headers")
        if isinstance(headers, dict):
            for key in list(headers.keys()):
                lk = key.lower()
                if lk in ("authorization", "cookie", "x-api-key") or _SENSITIVE_KEY.search(key):
                    headers[key] = "[Redacted]"
        data = req.get("data")
        if isinstance(data, dict):
            for k in list(data.keys()):
                if _SENSITIVE_KEY.search(k):
                    data[k] = "[Redacted]"
    return event


def init_sentry() -> None:
    dsn = (settings.SENTRY_DSN or "").strip()
    if not dsn:
        return
    sentry_sdk.init(
        dsn=dsn,
        environment=settings.ENVIRONMENT,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.1,
        send_default_pii=False,
        before_send=_scrub_event,  # type: ignore[arg-type]
    )
