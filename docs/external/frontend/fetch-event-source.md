# @microsoft/fetch-event-source — Reference for Forge

**Version:** 2.0.1
**Last researched:** 2026-04-19

## What Forge Uses

Microsoft's `fetch-event-source` for consuming SSE from the Studio generation endpoint. Native `EventSource` only supports GET; we need POST with a JSON body for `POST /api/v1/studio/generate`.

## Why Not Native EventSource

| Feature | Native EventSource | fetch-event-source |
|---------|-------------------|-------------------|
| HTTP method | GET only | Any (POST, PUT, etc.) |
| Request body | None | JSON, FormData, etc. |
| Custom headers | None | Full header control |
| Auth tokens | Cookie only | Headers + cookies |
| Error handling | Basic | Full control |
| Reconnection | Automatic | Customizable |

## SSE Hook for Forge Studio

```typescript
// src/lib/sse.ts
import { fetchEventSource } from '@microsoft/fetch-event-source';

interface StudioGenerateOptions {
  prompt: string;
  pageId?: string;
  sessionId: string;
  onIntent?: (data: IntentData) => void;
  onHtmlChunk?: (chunk: string) => void;
  onComplete?: (data: CompleteData) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

export async function streamGenerate({
  prompt,
  pageId,
  sessionId,
  onIntent,
  onHtmlChunk,
  onComplete,
  onError,
  signal,
}: StudioGenerateOptions) {
  await fetchEventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/studio/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, page_id: pageId, session_id: sessionId }),
    signal,

    onopen(response) {
      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }
    },

    onmessage(event) {
      switch (event.event) {
        case 'intent':
          onIntent?.(JSON.parse(event.data));
          break;
        case 'html.chunk':
          const { chunk } = JSON.parse(event.data);
          onHtmlChunk?.(chunk);
          break;
        case 'html.complete':
          onComplete?.(JSON.parse(event.data));
          break;
        case 'error':
          onError?.(new Error(JSON.parse(event.data).message));
          break;
      }
    },

    onerror(err) {
      // Don't retry on errors — let the UI handle it
      throw err;
    },

    // Credentials for auth cookies
    credentials: 'include',
  });
}
```

## Usage in Studio Component

```tsx
'use client';
import { useCallback, useRef } from 'react';
import { streamGenerate } from '@/lib/sse';
import { useStudioStore } from '@/stores/studio';

function useStudioGenerate() {
  const abortRef = useRef<AbortController | null>(null);
  const { setGenerating, appendPreviewChunk, setPreviewHtml } = useStudioStore();

  const generate = useCallback(async (prompt: string) => {
    // Abort any existing generation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setPreviewHtml('');

    try {
      await streamGenerate({
        prompt,
        sessionId: crypto.randomUUID(),
        onHtmlChunk: (chunk) => appendPreviewChunk(chunk),
        onComplete: (data) => {
          setGenerating(false);
          // Save page ID, navigate, etc.
        },
        onError: (err) => {
          setGenerating(false);
          toast.error(err.message);
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGenerating(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setGenerating(false);
  }, []);

  return { generate, cancel };
}
```

## Known Pitfalls

1. **AbortController**: Always provide an AbortController signal. SSE connections persist until explicitly closed.
2. **Error handling**: By default, fetch-event-source retries on error. Throw in `onerror` to prevent infinite retries.
3. **Credentials**: Include `credentials: 'include'` for auth cookies to be sent.
4. **No automatic reconnection**: Unlike native EventSource, you must implement reconnection logic if desired.
5. **Keepalive pings**: The server should send periodic keepalive events to prevent proxy/LB timeouts.

## Links
- [fetch-event-source GitHub](https://github.com/Azure/fetch-event-source)
- [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
