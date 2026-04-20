"""Constant-time comparisons for secrets (timing-attack resistant)."""

from __future__ import annotations

import hashlib
import hmac


def constant_time_str_equal(a: str, b: str) -> bool:
    """Return True iff ``a`` and ``b`` are identical.

    Uses SHA-256 digests before :func:`hmac.compare_digest` so callers never hit
    ``compare_digest``'s equal-length requirement when comparing a user header to
    a configured secret.
    """
    da = hashlib.sha256(a.encode("utf-8")).digest()
    db = hashlib.sha256(b.encode("utf-8")).digest()
    return hmac.compare_digest(da, db)
