"""Client IP extraction (BI-02) — optional trust for ``X-Forwarded-For`` behind a reverse proxy."""

from __future__ import annotations

from starlette.requests import Request

from app.config import settings


def get_client_ip(request: Request) -> str:
    """Return the client IP.

    When ``TRUST_PROXY_HEADERS`` is false (default), only ``request.client.host`` is used so
    clients cannot spoof ``X-Forwarded-For``. Enable in staging/prod behind a known proxy/LB.
    Test ASGI clients often send ``X-Forwarded-For``; we honor it when ``ENVIRONMENT=test``.
    """
    if settings.TRUST_PROXY_HEADERS or settings.ENVIRONMENT == "test":
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            # Leftmost is the original client when each proxy appends (common on AWS/GCP).
            first = fwd.split(",")[0].strip()
            if first:
                return first
    if request.client:
        return request.client.host
    return "unknown"
