"""LiteLLM-backed routing with timeouts, fallback chain, and usage metrics."""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Literal
from uuid import UUID

from litellm import acompletion
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.ai.exceptions import LLMConfigurationError, LLMProviderError
from app.services.ai.metrics import record_llm_metric
from app.services.ai.usage import record_llm_usage

logger = logging.getLogger(__name__)

TaskName = Literal["intent", "compose", "section_edit"]

# Provider override (Studio body) → default LiteLLM model ids when env uses short names.
_PROVIDER_DEFAULTS: dict[str, dict[str, str]] = {
    "openai": {
        "intent": "gpt-4o-mini",
        "compose": "gpt-4o",
        "section_edit": "gpt-4o-mini",
    },
    "anthropic": {
        "intent": "anthropic/claude-3-5-haiku-20241022",
        "compose": "anthropic/claude-3-5-sonnet-20241022",
        "section_edit": "anthropic/claude-3-5-haiku-20241022",
    },
    "gemini": {
        "intent": "gemini/gemini-2.0-flash",
        "compose": "gemini/gemini-2.0-flash",
        "section_edit": "gemini/gemini-2.0-flash",
    },
}


def _has_any_llm_key() -> bool:
    return bool(
        settings.OPENAI_API_KEY.strip()
        or settings.ANTHROPIC_API_KEY.strip()
        or settings.GOOGLE_API_KEY.strip()
    )


def _ensure_keys_for_model(model: str) -> None:
    m = model.lower()
    if ("gpt" in m or m.startswith("openai/")) and not settings.OPENAI_API_KEY.strip():
        raise LLMConfigurationError("OPENAI_API_KEY is not set")
    if ("claude" in m or "anthropic/" in m) and not settings.ANTHROPIC_API_KEY.strip():
        raise LLMConfigurationError("ANTHROPIC_API_KEY is not set")
    if ("gemini" in m or m.startswith("gemini/")) and not settings.GOOGLE_API_KEY.strip():
        raise LLMConfigurationError("GOOGLE_API_KEY is not set")


def _primary_model(task: TaskName, provider: str | None) -> str:
    env_model = {
        "intent": settings.LLM_MODEL_INTENT,
        "compose": settings.LLM_MODEL_COMPOSE,
        "section_edit": settings.LLM_MODEL_SECTION_EDIT,
    }[task]
    if env_model.strip() and "/" in env_model:
        return env_model.strip()
    if env_model.strip():
        return env_model.strip()
    p = (provider or settings.LLM_DEFAULT_PROVIDER or "openai").lower()
    if p not in _PROVIDER_DEFAULTS:
        p = "openai"
    return _PROVIDER_DEFAULTS[p][task]


def _model_chain(task: TaskName, provider: str | None) -> list[str]:
    primary = _primary_model(task, provider)
    fallbacks = settings.llm_fallback_model_list()
    seen: set[str] = set()
    out: list[str] = []
    for m in [primary, *fallbacks]:
        if m and m not in seen:
            seen.add(m)
            out.append(m)
    return out


def _usage_dict(response: Any) -> dict[str, Any]:
    u = getattr(response, "usage", None)
    if u is None:
        return {}
    try:
        return {
            "prompt_tokens": getattr(u, "prompt_tokens", None),
            "completion_tokens": getattr(u, "completion_tokens", None),
            "total_tokens": getattr(u, "total_tokens", None),
        }
    except Exception:
        return {}


def _cache_hit_from_response(response: Any) -> bool:
    h = getattr(response, "_hidden_params", None)
    if isinstance(h, dict) and h.get("cache_hit"):
        return True
    return bool(getattr(response, "cache_hit", False))


async def completion_text(
    messages: list[dict[str, Any]],
    *,
    task: TaskName,
    provider: str | None = None,
    temperature: float = 0.2,
    db: AsyncSession | None = None,
    organization_id: UUID | None = None,
) -> tuple[str, dict[str, Any]]:
    """Single non-streaming completion; returns (text, usage_metadata)."""
    if not _has_any_llm_key():
        raise LLMConfigurationError("No LLM API keys configured (OPENAI / ANTHROPIC / GOOGLE)")

    errors: list[str] = []
    for model in _model_chain(task, provider):
        try:
            _ensure_keys_for_model(model)
        except LLMConfigurationError as e:
            errors.append(f"{model}: {e}")
            continue

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "timeout": settings.LLM_TIMEOUT_SECONDS,
            "temperature": temperature,
            "max_retries": 0,
        }

        t0 = time.perf_counter()
        try:
            response = await acompletion(**kwargs)
        except Exception as e:
            err = f"{model}: {type(e).__name__}: {e}"
            logger.warning("llm.completion_failed %s", err)
            errors.append(err)
            continue

        latency_ms = int((time.perf_counter() - t0) * 1000)
        text = ""
        if response.choices and response.choices[0].message:
            text = response.choices[0].message.content or ""
        usage = _usage_dict(response)
        ch = _cache_hit_from_response(response)
        meta = {"model": model, "latency_ms": latency_ms, "cache_hit": ch, **usage}
        if settings.LLM_LOG_METRICS:
            logger.info(
                json.dumps(
                    {
                        "event": "llm_call",
                        "provider": "litellm",
                        "model": model,
                        "route": task,
                        "prompt_tokens": usage.get("prompt_tokens"),
                        "completion_tokens": usage.get("completion_tokens"),
                        "latency_ms": latency_ms,
                        "cache_hit": ch,
                        "cost_cents": None,
                    },
                    default=str,
                )
            )
        record_llm_metric(
            task=task,
            model=model,
            organization_id=organization_id,
            latency_ms=latency_ms,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            cache_hit=ch,
        )
        if db is not None and organization_id is not None:
            await record_llm_usage(
                db,
                organization_id,
                task=task,
                model=model,
                prompt_tokens=usage.get("prompt_tokens"),
                completion_tokens=usage.get("completion_tokens"),
                cache_hit=ch,
            )
        return text.strip(), meta

    err_detail = "; ".join(errors) if errors else "none"
    raise LLMProviderError(f"All LLM models failed for task {task}: {err_detail}")
