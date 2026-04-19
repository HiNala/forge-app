"""In-memory LLM call metrics for admin dashboard (Mission 03)."""

from __future__ import annotations

import time
from collections import deque
from threading import Lock
from typing import Any
from uuid import UUID

_MAX = 2000
_buffer: deque[dict[str, Any]] = deque(maxlen=_MAX)
_lock = Lock()


def record_llm_metric(
    *,
    task: str,
    model: str,
    organization_id: UUID | None,
    latency_ms: int,
    prompt_tokens: int | None,
    completion_tokens: int | None,
    cache_hit: bool,
) -> None:
    entry = {
        "ts": time.time(),
        "task": task,
        "model": model,
        "organization_id": str(organization_id) if organization_id else None,
        "latency_ms": latency_ms,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "cache_hit": cache_hit,
    }
    with _lock:
        _buffer.append(entry)


def snapshot_last_minute() -> dict[str, Any]:
    cutoff = time.time() - 60
    with _lock:
        recent = [e for e in _buffer if e["ts"] >= cutoff]
    tpm = sum(int(e.get("prompt_tokens") or 0) for e in recent)
    tcm = sum(int(e.get("completion_tokens") or 0) for e in recent)
    cache_hits = sum(1 for e in recent if e.get("cache_hit"))
    return {
        "calls_last_minute": len(recent),
        "prompt_tokens_last_minute": tpm,
        "completion_tokens_last_minute": tcm,
        "cache_hits_last_minute": cache_hits,
        "total_calls_buffered": len(_buffer),
    }
