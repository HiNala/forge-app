"""BI-02 — middleware registration order (see docs/architecture/REQUEST_PIPELINE.md)."""

from __future__ import annotations

from app.main import app


def test_middleware_ingress_order_outermost_first() -> None:
    """Last ``add_middleware`` in ``main.py`` is outermost (first to see the request)."""
    names = [m.cls.__name__ for m in app.user_middleware]
    assert names[0] == "RequestContextMiddleware"
    assert "CORSMiddleware" in names
    assert names[-1] == "CORSMiddleware"
