# Google Gemini API — Reference for Forge

**Version:** v1 (Gemini 2.5 Pro, Gemini Flash)
**Last researched:** 2026-04-19

## What Forge Uses

Google Gemini as a third LLM provider via LiteLLM. Models: Gemini 2.5 Pro for heavy generation, Gemini Flash for fast edits.

## Via LiteLLM

```python
from litellm import acompletion

response = await acompletion(
    model="gemini/gemini-2.5-pro",
    messages=[
        {"role": "system", "content": "You are a web page generator..."},
        {"role": "user", "content": "Create a booking form..."},
    ],
    max_tokens=4000,
)

# Streaming
response = await acompletion(
    model="gemini/gemini-2.0-flash",
    messages=[...],
    stream=True,
)
async for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        yield content
```

## Known Pitfalls

1. **API key**: Set `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) in environment.
2. **Different safety settings**: Gemini has stricter content filtering. May reject some prompts.
3. **Rate limits**: Check your API key's quota in Google AI Studio.

## Links
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [LiteLLM Gemini](https://docs.litellm.ai/docs/providers/gemini)
