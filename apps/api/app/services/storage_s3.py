"""S3-compatible uploads (MinIO in dev)."""

from __future__ import annotations

import logging
import mimetypes
from typing import Any
from uuid import UUID

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)


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
    """Create bucket if it doesn't exist. Idempotent; safe to call multiple times."""
    c = _client()
    try:
        c.head_bucket(Bucket=settings.S3_BUCKET)
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        # 404 = bucket doesn't exist; 403 may mean no access to head but bucket exists
        if error_code in ("404", "NoSuchBucket"):
            try:
                c.create_bucket(Bucket=settings.S3_BUCKET)
            except ClientError as create_err:
                logger.warning("ensure_bucket create failed: %s", create_err)
        # 403 = bucket exists but we can't head it (different error, bucket likely exists)
        elif error_code == "403":
            logger.debug("ensure_bucket: head_bucket returned 403, assuming bucket exists")
        else:
            logger.warning("ensure_bucket head_bucket error: %s", e)


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
