"""Map exceptions to Forge JSON error bodies (BI-02)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


async def forge_http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    rid = _request_id(request)
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        code = str(detail.get("code", "error"))
        msg = detail.get("message")
        if not isinstance(msg, str) or not msg.strip():
            msg = "Quota exceeded" if code == "quota_exceeded" else code.replace("_", " ").title()
        extra_inner = detail.get("extra") if isinstance(detail.get("extra"), dict) else {}
        extra_rest = {
            k: v
            for k, v in detail.items()
            if k not in ("code", "message", "extra")
        }
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": code,
                "message": msg,
                "extra": {**extra_rest, **extra_inner},
                "request_id": rid,
            },
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": jsonable_encoder(detail), "request_id": rid},
    )


def _flatten_validation_errors(exc: RequestValidationError) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for err in exc.errors():
        loc = err.get("loc") or ()
        field = ".".join(str(x) for x in loc if x not in ("body", "query", "path"))
        out.append({"field": field or "request", "message": err.get("msg", "Invalid")})
    return out


async def request_validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "code": "validation_error",
            "message": "Validation failed",
            "extra": {"fields": _flatten_validation_errors(exc)},
            "request_id": _request_id(request),
        },
    )


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    is_prod = settings.ENVIRONMENT == "production"
    logger.warning("integrity_error: %s", exc, exc_info=not is_prod)
    orig = exc.orig
    pg = getattr(orig, "sqlstate", None) or getattr(orig, "pgcode", None) if orig is not None else None
    if pg in ("23505",):
        return JSONResponse(
            status_code=409,
            content={
                "code": "conflict",
                "message": "Unique constraint violated",
                "extra": {},
                "request_id": _request_id(request),
            },
        )
    if pg in ("23503",):
        return JSONResponse(
            status_code=404,
            content={
                "code": "not_found",
                "message": "Related resource not found",
                "extra": {},
                "request_id": _request_id(request),
            },
        )
    return JSONResponse(
        status_code=500,
        content=(
            {
                "code": "internal_error",
                "message": "Database constraint error",
                "extra": {},
                "request_id": _request_id(request),
            }
            if settings.ENVIRONMENT == "production"
            else {
                "code": "internal_error",
                "message": str(exc),
                "extra": {},
                "request_id": _request_id(request),
            }
        ),
    )


async def payload_too_large_handler(request: Request, exc: Exception) -> JSONResponse:
    del exc
    return JSONResponse(
        status_code=413,
        content={
            "code": "payload_too_large",
            "message": "Request body too large",
            "extra": {},
            "request_id": _request_id(request),
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled: %s", exc)
    rid = _request_id(request)
    if settings.ENVIRONMENT == "production":
        return JSONResponse(
            status_code=500,
            content={
                "code": "internal_error",
                "message": "Something went wrong",
                "extra": {},
                "request_id": rid,
            },
        )
    return JSONResponse(
        status_code=500,
        content={
            "code": "internal_error",
            "message": str(exc),
            "extra": {},
            "request_id": rid,
        },
    )
