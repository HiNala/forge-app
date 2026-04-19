# Prompt Caching Strategies — Reference for Forge

**Version:** N/A (cross-provider)
**Last researched:** 2026-04-19

## What Forge Uses

Prompt caching to reduce LLM costs and latency for repeated operations.

## Provider-Level Caching

### OpenAI
- Automatic caching for identical prompts within a short window
- No explicit API needed — OpenAI caches on their end
- ~50% cost reduction on cached prompts

### Anthropic
- Explicit `cache_control` parameter on message content blocks
- Cache large system prompts (component library, brand kit instructions)
- 90% cost reduction on cached prompt tokens
- TTL: 5 minutes (ephemeral cache)

### Google Gemini
- Context caching via `CachedContent` API
- Cache long system instructions
- Billed per-token for storage + reduced per-token for usage

## Application-Level Caching (Redis)

```python
# Cache identical prompts in Redis to avoid hitting the LLM at all
import hashlib
import json

async def cached_generate(messages, tier, ttl=1800):
    # Hash the messages for cache key
    cache_key = f"llm:{hashlib.sha256(json.dumps(messages).encode()).hexdigest()[:16]}"

    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    response = await generate(messages, tier=tier)
    result = response.choices[0].message.content

    await redis_client.setex(cache_key, ttl, json.dumps(result))
    return result
```

## Forge-Specific Strategies

1. **System prompt caching**: The component library reference (~2000 tokens) is the same for every generation. Cache it with Anthropic's `cache_control`.
2. **Suggestion chip re-clicks**: If Lucy clicks "Make it more minimal" twice, the second click hits Redis cache.
3. **Brand kit in prompt**: Brand kit tokens (~200 tokens) rarely change. Include in the cached system prompt block.
4. **Section edits are cheap**: Fast model + small prompt (single section HTML ~200-500 tokens + instruction). No caching needed — already under $0.001 per edit.

## Token Budget Per Operation

| Operation | Model | Prompt Tokens | Completion Tokens | Est. Cost |
|-----------|-------|---------------|-------------------|-----------|
| Full page generation | Heavy | ~3,000 | ~3,000 | ~$0.03 |
| Section edit | Fast | ~800 | ~500 | ~$0.0005 |
| Intent parsing | Fast | ~500 | ~200 | ~$0.0002 |
| Reply draft | Fast | ~400 | ~200 | ~$0.0002 |

## Links
- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [OpenAI Caching](https://platform.openai.com/docs/guides/caching)
