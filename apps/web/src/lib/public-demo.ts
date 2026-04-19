import { fetchEventSource } from "@microsoft/fetch-event-source";

import { getApiUrl } from "./api";

export type PublicDemoHandlers = {
  onIntent?: (data: unknown) => void;
  onHtmlChunk?: (data: unknown) => void;
  onComplete?: (data: { html?: string; title?: string; slug?: string }) => void;
  /** SSE `error` event from server (e.g. rate limit). */
  onError?: (data: unknown) => void;
};

/**
 * Anonymous hero demo — POST /public/demo (SSE). No auth headers.
 */
export async function streamPublicDemo(
  prompt: string,
  handlers: PublicDemoHandlers,
  signal?: AbortSignal,
): Promise<void> {
  await fetchEventSource(`${getApiUrl()}/public/demo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ prompt }),
    signal,
    onmessage(ev) {
      if (!ev.event || !ev.data) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data) as unknown;
      } catch {
        return;
      }
      switch (ev.event) {
        case "intent":
          handlers.onIntent?.(parsed);
          break;
        case "html.chunk":
          handlers.onHtmlChunk?.(parsed);
          break;
        case "html.complete":
          handlers.onComplete?.(parsed as { html?: string; title?: string; slug?: string });
          break;
        case "error":
          handlers.onError?.(parsed);
          break;
        default:
          break;
      }
    },
    onerror(err) {
      console.error("public demo SSE:", err);
      throw err;
    },
  });
}
