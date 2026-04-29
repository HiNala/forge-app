"""Password hashing policy for first-party auth."""

from __future__ import annotations

from typing import cast

from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return cast(str, _pwd_context.hash(password))


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return bool(_pwd_context.verify(password, password_hash))
