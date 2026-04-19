"""Symmetric encryption for OAuth tokens (Fernet derived from SECRET_KEY)."""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from app.config import settings


def _fernet() -> Fernet:
    key = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_text(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_text(token: str) -> str:
    return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
