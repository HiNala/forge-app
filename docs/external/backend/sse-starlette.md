# sse-starlette — Reference for Forge

**Version:** 2.2.x
**Last researched:** 2026-04-19

## What Forge Uses

sse-starlette for Server-Sent Events in the Studio generation and refinement endpoints. Streams HTML chunks from the LLM back to the frontend preview pane.

## Usage with FastAPI

```python
from sse_starlette.sse import EventSourceResponse
from fastapi import Request
import json

@router.post("/studio/generate")
async def generate_page(request: Request, body: GenerateRequest):
    async def event_generator():
        # Check for client disconnect
        if await request.is_disconnected():
            return

        # Stream intent
        yield {
            "event": "intent",
            "data": json.dumps({"page_type": "booking_form", "fields": [...]}),
        }

        # Stream HTML chunks
        yield {"event": "html.start", "data": "{}"}

        async for chunk in llm_stream:
            if await request.is_disconnected():
                return
            yield {
                "event": "html.chunk",
                "data": json.dumps({"chunk": chunk}),
            }

        # Signal completion
        yield {
            "event": "html.complete",
            "data": json.dumps({"page_id": "...", "slug": "..."}),
        }

    return EventSourceResponse(
        event_generator(),
        headers={"X-Accel-Buffering": "no"},  # Disable proxy buffering
        ping=15,  # Send keepalive ping every 15 seconds
    )
```

## Event Format

Each yielded dict becomes an SSE event:
```
event: html.chunk
data: {"chunk":"<section class=\"hero\">..."}

event: html.chunk
data: {"chunk":"</section>..."}

event: html.complete
data: {"page_id":"uuid","slug":"small-jobs"}
```

## Known Pitfalls

1. **`X-Accel-Buffering: no`**: Required when behind Nginx/Caddy to prevent response buffering.
2. **Client disconnect**: Always check `request.is_disconnected()` in long-running generators.
3. **Keepalive pings**: Set `ping=15` to prevent proxy timeout (default 60s on many proxies).
4. **POST support**: sse-starlette works with any HTTP method; the frontend uses `@microsoft/fetch-event-source` for POST.
5. **JSON in data**: Always JSON-serialize the data field. SSE data must be a string.

## Links
- [sse-starlette GitHub](https://github.com/sysid/sse-starlette)
- [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
