"""BI-02 — middleware registration order matches ``docs/architecture/REQUEST_PIPELINE.md``."""

from __future__ import annotations

from app.main import app


def test_middleware_stack_order() -> None:
    """``user_middleware`` lists outermost first (first to handle an incoming request)."""
    names = [m.cls.__name__ for m in app.user_middleware]
    assert names == [
        "RequestContextMiddleware",
        "BodySizeLimitMiddleware",
        "GZipMiddleware",
        "TrustedHostMiddleware",
        "RateLimitMiddleware",
        "TenantMiddleware",
        "CORSMiddleware",
    ]
