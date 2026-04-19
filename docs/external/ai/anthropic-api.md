# Anthropic API — Reference for Forge

**Version:** Messages API v1 (Claude Opus 4.7, Claude Haiku 4.5)
**Last researched:** 2026-04-19

## What Forge Uses

Anthropic as an alternative LLM provider via LiteLLM. Models: Claude Opus 4.7 for heavy generation, Claude Haiku 4.5 for fast section edits.

## Via LiteLLM

```python
from litellm import acompletion

# Non-streaming
response = await acompletion(
    model="anthropic/claude-opus-4-20250514",
    messages=[
        {"role": "system", "content": "You are a web page generator..."},
        {"role": "user", "content": "Create a booking form..."},
    ],
    max_tokens=4000,
)

# Streaming
response = await acompletion(
    model="anthropic/claude-haiku-4-20250514",
    messages=[...],
    stream=True,
)
async for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        yield content
```

## Prompt Caching

Anthropic supports explicit prompt caching with `cache_control`:

```python
response = await acompletion(
    model="anthropic/claude-haiku-4-20250514",
    messages=[
        {
            "role": "system",
            "content": [
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,  # Large system prompt
                    "cache_control": {"type": "ephemeral"},  # Cache this
                }
            ],
        },
        {"role": "user", "content": user_prompt},
    ],
)
# Cached prompts cost 90% less on subsequent calls
```

## Streaming Event Types (Native API)

If using the native API directly:
- `message_start` — contains model, usage
- `content_block_start` — new content block
- `content_block_delta` — incremental text
- `content_block_stop` — block complete
- `message_delta` — final usage stats
- `message_stop` — stream complete

LiteLLM normalizes these to OpenAI-compatible format.

## Known Pitfalls

1. **`max_tokens` is required**: Unlike OpenAI, Anthropic requires you to specify `max_tokens`.
2. **System prompt format**: Use the `messages` format, not a separate `system` parameter, for caching.
3. **Rate limits**: Lower than OpenAI by default. Apply for higher limits in production.

## Links
- [Anthropic API Docs](https://docs.anthropic.com/en/api/)
- [Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
