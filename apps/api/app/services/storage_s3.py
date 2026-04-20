"""S3-compatible uploads (MinIO in dev)."""

from __future__ import annotations

import mimetypes
from typing import Any
from uuid import UUID

import boto3
from botocore.config import Config

from app.config import settings


def _client() -> Any:
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


def ensure_bucket() -> None:
    c = _client()
    try:
        c.head_bucket(Bucket=settings.S3_BUCKET)
    except Exception:
        c.create_bucket(Bucket=settings.S3_BUCKET)


def upload_brand_logo(
    *,
    organization_id: UUID,
    content: bytes,
    content_type: str,
    ext: str,
) -> str:
    ensure_bucket()
    key = f"org/{organization_id}/brand/logo.{ext}"
    c = _client()
    c.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=content,
        ContentType=content_type,
    )
    base = settings.PUBLIC_ASSET_BASE_URL.rstrip("/")
    return f"{base}/{key}"


def upload_template_preview_png(*, template_id: UUID, content: bytes) -> str:
    """Store template gallery screenshot; returns public URL."""
    ensure_bucket()
    key = f"templates/{template_id}/preview.png"
    c = _client()
    c.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=content,
        ContentType="image/png",
    )
    base = settings.PUBLIC_ASSET_BASE_URL.rstrip("/")
    return f"{base}/{key}"


def guess_ext(filename: str, content_type: str) -> str:
    ext = mimetypes.guess_extension(content_type.split(";")[0].strip()) or ""
    ext = ext.lstrip(".")
    if ext in ("jpeg", "jpe"):
        ext = "jpg"
    if ext in ("svg", "png", "jpg", "webp"):
        return ext
    if filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".svg")):
        return filename.rsplit(".", 1)[-1].lower()
    return "bin"


def submission_upload_key(
    *,
    organization_id: UUID,
    page_id: UUID,
    upload_token: UUID,
    filename: str,
) -> str:
    ext = guess_ext(filename, "application/octet-stream")
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)[:120]
    if not safe:
        safe = f"file.{ext}"
    return f"org/{organization_id}/pages/{page_id}/uploads/{upload_token}/{safe}"


def presigned_put_object(*, key: str, content_type: str, expires_in: int = 3600) -> str:
    ensure_bucket()
    c = _client()
    return c.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET,
            "Key": key,
            "ContentType": content_type.split(";")[0].strip(),
        },
        ExpiresIn=expires_in,
    )


def presigned_get_object(*, key: str, expires_in: int = 900) -> str:
    ensure_bucket()
    c = _client()
    return c.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key},
        ExpiresIn=expires_in,
    )


def head_object(*, key: str) -> dict[str, Any]:
    c = _client()
    r = c.head_object(Bucket=settings.S3_BUCKET, Key=key)
    return {
        "ContentLength": int(r["ContentLength"]),
        "ContentType": (r.get("ContentType") or "").split(";")[0].strip(),
    }


def get_object_prefix_bytes(*, key: str, max_bytes: int = 512) -> bytes:
    c = _client()
    o = c.get_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Range=f"bytes=0-{max_bytes - 1}",
    )
    return o["Body"].read()


def put_object_bytes(*, key: str, body: bytes, content_type: str) -> None:
    ensure_bucket()
    c = _client()
    c.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=body,
        ContentType=content_type.split(";")[0].strip(),
    )


def sniff_bytes_mime(data: bytes) -> str | None:
    """Magic-byte sniff for common upload types (PDF + images)."""
    if len(data) >= 4 and data[:4] == b"%PDF":
        return "application/pdf"
    if len(data) >= 8 and data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if len(data) >= 3 and data[:2] == b"\xff\xd8":
        return "image/jpeg"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if len(data) >= 6 and data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    return None
