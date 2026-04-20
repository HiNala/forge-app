"""Form file fields: schema resolution, validation, S3 verification (Mission 04)."""

from __future__ import annotations

import re
import uuid
from typing import Any
from uuid import UUID

from app.services.storage_s3 import (
    get_object_prefix_bytes,
    head_object,
    put_object_bytes,
    sniff_bytes_mime,
    submission_upload_key,
)

DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024

_DEFAULT_ACCEPT: frozenset[str] = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
    }
)


def _fields_list(form_schema: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not form_schema or not isinstance(form_schema, dict):
        return []
    raw = form_schema.get("fields")
    if not isinstance(raw, list):
        return []
    return [x for x in raw if isinstance(x, dict)]


def field_def_for_name(form_schema: dict[str, Any] | None, field_name: str) -> dict[str, Any] | None:
    for f in _fields_list(form_schema):
        n = f.get("name")
        if isinstance(n, str) and n == field_name:
            return f
    return None


def is_file_field(fd: dict[str, Any]) -> bool:
    t = str(fd.get("type", "")).lower()
    return t in ("file", "attachment", "upload")


def file_field_constraints(fd: dict[str, Any]) -> tuple[int, frozenset[str]]:
    max_b = fd.get("max_size_bytes")
    cap = (
        min(max_b, 50 * 1024 * 1024)
        if isinstance(max_b, int) and max_b > 0
        else DEFAULT_MAX_FILE_BYTES
    )
    acc = fd.get("accept")
    if isinstance(acc, list) and acc:
        mimes = frozenset(str(x).lower() for x in acc if isinstance(x, str))
        return cap, mimes if mimes else _DEFAULT_ACCEPT
    return cap, _DEFAULT_ACCEPT


def storage_key_in_scope(*, key: str, organization_id: UUID, page_id: UUID) -> bool:
    if ".." in key or key.startswith("/"):
        return False
    prefix = f"org/{organization_id}/pages/{page_id}/uploads/"
    return key.startswith(prefix)


_mime_alias = {
    "image/jpg": "image/jpeg",
}


def _norm_mime(m: str) -> str:
    s = m.split(";")[0].strip().lower()
    return _mime_alias.get(s, s)


def mime_allowed(declared: str, sniffed: str | None, allowed: frozenset[str]) -> bool:
    d = _norm_mime(declared)
    if d in allowed:
        return True
    if sniffed and sniffed in allowed:
        return True
    for pat in allowed:
        if pat.endswith("/*"):
            base = pat[:-2]
            if d.startswith(base + "/") or (sniffed and sniffed.startswith(base + "/")):
                return True
    return False


def verify_uploaded_file_ref(
    *,
    organization_id: UUID,
    page_id: UUID,
    field_name: str,
    ref: dict[str, Any],
    form_schema: dict[str, Any] | None,
) -> tuple[bool, str]:
    """Ensure presigned upload completed; size/MIME match field rules."""
    key = ref.get("storage_key")
    if not isinstance(key, str) or not key.strip():
        return False, f"Invalid file reference for {field_name}"
    if not storage_key_in_scope(key=key, organization_id=organization_id, page_id=page_id):
        return False, f"Invalid storage key for {field_name}"
    fd = field_def_for_name(form_schema, field_name)
    if fd is None:
        return False, f"Unknown field: {field_name}"
    if not is_file_field(fd):
        return False, f"Field is not a file upload: {field_name}"
    max_b, allowed = file_field_constraints(fd or {})
    try:
        sz_claim = int(ref.get("size_bytes", 0))
    except (TypeError, ValueError):
        return False, f"Invalid size for {field_name}"
    try:
        meta = head_object(key=key)
    except Exception:
        return False, f"Uploaded file not found for {field_name}"
    cl = int(meta["ContentLength"])
    if cl != sz_claim:
        return False, f"Size mismatch for {field_name}"
    if cl > max_b:
        return False, f"File too large for {field_name}"
    ct_decl = ref.get("content_type")
    if not isinstance(ct_decl, str):
        ct_decl = (meta.get("ContentType") or "application/octet-stream").split(";")[0].strip()
    prefix = get_object_prefix_bytes(key=key, max_bytes=512)
    sniffed = sniff_bytes_mime(prefix)
    if not mime_allowed(ct_decl, sniffed, allowed):
        return False, f"File type not allowed for {field_name}"
    return True, ""


def file_ref_dict(
    *,
    storage_key: str,
    file_name: str,
    size_bytes: int,
    content_type: str,
) -> dict[str, Any]:
    return {
        "storage_key": storage_key,
        "file_name": file_name,
        "size_bytes": size_bytes,
        "content_type": _norm_mime(content_type),
    }


def collect_file_refs_from_payload(payload: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    out: list[tuple[str, dict[str, Any]]] = []
    for k, v in payload.items():
        if isinstance(v, dict) and isinstance(v.get("storage_key"), str) and isinstance(v.get("file_name"), str):
            out.append((str(k), v))
    return out


def new_upload_token() -> uuid.UUID:
    return uuid.uuid4()


def upload_bytes_for_field(
    *,
    organization_id: UUID,
    page_id: UUID,
    field_name: str,
    content: bytes,
    original_filename: str,
    content_type: str | None,
    form_schema: dict[str, Any] | None,
) -> dict[str, Any]:
    """Store multipart file bytes for a declared file field; returns payload file ref."""
    fd = field_def_for_name(form_schema, field_name)
    if fd is None:
        raise ValueError(f"Unknown field: {field_name}")
    if not is_file_field(fd):
        raise ValueError(f"Not a file field: {field_name}")
    max_b, allowed = file_field_constraints(fd)
    if len(content) > max_b:
        raise ValueError(f"File too large for {field_name}")
    ct = (content_type or "application/octet-stream").split(";")[0].strip()
    sniffed = sniff_bytes_mime(content[: min(512, len(content))])
    if not mime_allowed(ct, sniffed, allowed):
        raise ValueError(f"File type not allowed for {field_name}")
    token = new_upload_token()
    fn = safe_filename(original_filename)
    key = submission_upload_key(
        organization_id=organization_id,
        page_id=page_id,
        upload_token=token,
        filename=fn,
    )
    put_object_bytes(key=key, body=content, content_type=ct)
    return file_ref_dict(
        storage_key=key,
        file_name=fn,
        size_bytes=len(content),
        content_type=ct,
    )


def safe_filename(name: str) -> str:
    base = name.rsplit("/")[-1].strip() or "file"
    base = re.sub(r"[^\w.\- ]+", "_", base, flags=re.UNICODE).strip()
    return base[:200] if base else "file"
