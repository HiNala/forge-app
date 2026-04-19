# LiteLLM — LLM Provider Abstraction — Reference for Forge

**Version:** 1.83.7
**Last researched:** 2026-04-19

## What Forge Uses

LiteLLM as the unified interface for calling OpenAI, Anthropic, and Google Gemini. Chosen per ADR-003. Used as SDK (not proxy mode).

## Setup

```bash
uv add litellm
```

Environment variables:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
```

## Forge LLM Service Layer

```python
# app/services/ai/llm_service.py
from litellm import acompletion
from app.config import settings

# Model mapping
MODELS = {
    "heavy": {
        "openai": "gpt-4o",
        "anthropic": "anthropic/claude-opus-4-20250514",
        "gemini": "gemini/gemini-2.5-pro",
    },
    "fast": {
        "openai": "gpt-4o-mini",
        "anthropic": "anthropic/claude-haiku-4-20250514",
        "gemini": "gemini/gemini-2.0-flash",
    },
}

def get_model(tier: str, provider: str | None = None) -> str:
    provider = provider or settings.LLM_DEFAULT_PROVIDER
    return MODELS[tier][provider]

async def generate(
    messages: list[dict],
    tier: str = "heavy",
    provider: str | None = None,
    stream: bool = False,
    json_mode: bool = False,
    max_tokens: int = 4000,
    temperature: float = 0.7,
):
    model = get_model(tier, provider)

    kwargs = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": stream,
    }

    if json_mode and not stream:
        kwargs["response_format"] = {"type": "json_object"}

    response = await acompletion(**kwargs)
    return response

async def stream_generate(
    messages: list[dict],
    tier: str = "heavy",
    provider: str | None = None,
    max_tokens: int = 4000,
):
    model = get_model(tier, provider)

    response = await acompletion(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        stream=True,
    )

    async for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content

    # Token usage from the last chunk
    # chunk.usage may have the totals
```

## Token Tracking

```python
async def generate_with_tracking(messages, tier, org_id):
    response = await generate(messages, tier=tier)

    # Track usage
    usage = response.usage
    await update_subscription_usage(
        org_id=org_id,
        tokens_prompt=usage.prompt_tokens,
        tokens_completion=usage.completion_tokens,
        cost_cents=calculate_cost(response),
    )

    return response
```

## Cost Calculation

```python
from litellm import cost_per_token

def calculate_cost(response) -> int:
    """Calculate cost in cents."""
    prompt_cost, completion_cost = cost_per_token(
        model=response.model,
        prompt_tokens=response.usage.prompt_tokens,
        completion_tokens=response.usage.completion_tokens,
    )
    return int((prompt_cost + completion_cost) * 100)
```

## Fallback Chain

```python
async def generate_with_fallback(messages, tier="heavy"):
    providers = ["openai", "anthropic", "gemini"]
    for provider in providers:
        try:
            return await generate(messages, tier=tier, provider=provider)
        except Exception as e:
            logger.warning(f"Provider {provider} failed: {e}")
            continue
    raise Exception("All LLM providers failed")
```

## Security Note

LiteLLM had a supply chain compromise in March 2026 (versions 1.82.7-1.82.8). We pin to 1.83.7+ and verify checksums. Monitor for advisories.

## Known Pitfalls

1. **Pin version carefully**: Due to the March 2026 incident, always verify the version integrity.
2. **Streaming + JSON mode incompatible**: Can't use `response_format=json_object` with `stream=True`.
3. **Cost tracking**: `cost_per_token()` returns floats in dollars. Multiply by 100 for cents.
4. **Model names differ**: OpenAI uses `gpt-4o`, Anthropic needs `anthropic/` prefix, Gemini needs `gemini/` prefix.

## Links
- [LiteLLM Docs](https://docs.litellm.ai/)
- [Supported Models](https://docs.litellm.ai/docs/providers)
- [Streaming](https://docs.litellm.ai/docs/completion/stream)
