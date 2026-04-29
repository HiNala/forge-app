"""Bearer gate for `/health/deep` — no FastAPI app import."""

import pytest
from fastapi import HTTPException

from app.config import settings
from app.core.health_checks import authorize_deep_health_request


class _Req:
    __slots__ = ("headers",)

    def __init__(self, headers: dict[str, str] | None = None) -> None:
        self.headers = headers or {}


def test_authorize_deep_health_allows_when_no_metrics_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "METRICS_TOKEN", "")
    authorize_deep_health_request(_Req({}))


def test_authorize_deep_health_rejects_missing_bearer(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "METRICS_TOKEN", "a" * 40)
    with pytest.raises(HTTPException) as ei:
        authorize_deep_health_request(_Req({}))
    assert ei.value.status_code == 401


def test_authorize_deep_health_accepts_matching_bearer(monkeypatch: pytest.MonkeyPatch) -> None:
    tok = "b" * 40
    monkeypatch.setattr(settings, "METRICS_TOKEN", tok)
    authorize_deep_health_request(_Req({"authorization": f"Bearer {tok}"}))
