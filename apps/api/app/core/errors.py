"""Typed API errors → consistent JSON (BI-02)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ForgeError(Exception):
    code: str
    message: str
    http_status: int = 500
    extra: dict[str, Any] = field(default_factory=dict)


class NotAuthenticated(ForgeError):
    def __init__(self, message: str = "Not authenticated", extra: dict[str, Any] | None = None) -> None:
        super().__init__(
            code="unauthenticated",
            message=message,
            http_status=401,
            extra=extra or {},
        )


class NotAuthorized(ForgeError):
    def __init__(self, message: str = "Forbidden", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="forbidden", message=message, http_status=403, extra=extra or {})


class NotFound(ForgeError):
    def __init__(self, message: str = "Not found", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="not_found", message=message, http_status=404, extra=extra or {})


class ValidationFailed(ForgeError):
    def __init__(self, message: str = "Validation error", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="validation_error", message=message, http_status=422, extra=extra or {})


class Conflict(ForgeError):
    def __init__(self, message: str = "Conflict", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="conflict", message=message, http_status=409, extra=extra or {})


class RateLimited(ForgeError):
    def __init__(
        self,
        message: str = "Too many requests",
        *,
        retry_after_seconds: int = 60,
        extra: dict[str, Any] | None = None,
    ) -> None:
        ex = extra or {}
        ex.setdefault("retry_after_seconds", retry_after_seconds)
        super().__init__(code="rate_limited", message=message, http_status=429, extra=ex)


class QuotaExceeded(ForgeError):
    def __init__(self, message: str = "Quota exceeded", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="quota_exceeded", message=message, http_status=402, extra=extra or {})


class DependencyError(ForgeError):
    def __init__(self, message: str = "Upstream error", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="dependency_error", message=message, http_status=502, extra=extra or {})


class InternalError(ForgeError):
    def __init__(self, message: str = "Internal error", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="internal_error", message=message, http_status=500, extra=extra or {})


class OrgNotSpecified(ForgeError):
    def __init__(self, message: str = "Active organization required", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="org_not_specified", message=message, http_status=400, extra=extra or {})


class NotAMember(ForgeError):
    def __init__(self, message: str = "Not a member of this organization", extra: dict[str, Any] | None = None) -> None:
        super().__init__(code="not_a_member", message=message, http_status=403, extra=extra or {})
