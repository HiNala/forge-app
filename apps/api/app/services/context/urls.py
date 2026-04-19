"""URL extraction from prompts (Mission O-01)."""

from __future__ import annotations

import re

_URL_RE = re.compile(r"https?://[^\s>\"'`)]+", re.IGNORECASE)


def extract_urls_from_prompt(prompt: str) -> list[str]:
    found = _URL_RE.findall(prompt or "")
    # Strip trailing punctuation
    cleaned: list[str] = []
    for u in found:
        u = u.rstrip(".,;:)")
        if u not in cleaned:
            cleaned.append(u)
    return cleaned


def domain_from_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    return email.split("@", 1)[1].lower().strip()
