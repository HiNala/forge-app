# OpenAI API — Reference for Forge

**Version:** API v1 (latest, gpt-4o, gpt-4o-mini)
**Last researched:** 2026-04-19

## What Forge Uses

OpenAI as the default LLM provider (via LiteLLM). Models: `gpt-4o` for page generation (heavy), `gpt-4o-mini` for section edits (fast).

## Chat Completions (via LiteLLM)

```python
from litellm import completion, acompletion

# Synchronous
response = completion(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a web page generator..."},
        {"role": "user", "content": "Create a booking form for Reds Construction"},
    ],
    temperature=0.7,
    max_tokens=4000,
)
html = response.choices[0].message.content

# Async streaming
response = await acompletion(
    model="gpt-4o",
    messages=[...],
    stream=True,
)
async for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        yield content
```

## Structured Output (JSON Mode)

```python
response = await acompletion(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "Extract the page intent as JSON."},
        {"role": "user", "content": prompt},
    ],
    response_format={"type": "json_object"},
)
intent = json.loads(response.choices[0].message.content)
```

## Token Usage Tracking

```python
response = await acompletion(model="gpt-4o", messages=[...])
usage = response.usage
# usage.prompt_tokens, usage.completion_tokens, usage.total_tokens
```

## Known Pitfalls

1. **Rate limits**: Implement exponential backoff. Use `litellm`'s built-in retry.
2. **Token budget**: gpt-4o has 128K context. Page generation should stay under 8K prompt + 4K completion.
3. **JSON mode**: Requires the word "JSON" in the system prompt, or it may not respond in JSON.
4. **Streaming + structured output**: Cannot use `response_format=json_object` with streaming.

## Links
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Models](https://platform.openai.com/docs/models)
