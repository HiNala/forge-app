import { fetchEventSource } from "@microsoft/fetch-event-source";

import { FORGE_ACTIVE_ORG_HEADER, getApiUrl } from "./api";

type AuthOpts = {
  getToken: () => Promise<string | null>;
  activeOrgId: string | null;
  /** When aborted, the stream stops without surfacing an error. */
  signal?: AbortSignal;
};

/**
 * Authenticated Studio SSE (generate, refine, etc.) — sends Bearer + org header.
 * Pass `signal` to cancel (e.g. new prompt submitted or route change).
 */
export async function streamStudioSse(
  path: string,
  body: unknown,
  auth: AuthOpts,
  onMessage: (event: string, data: unknown) => void | Promise<void>,
): Promise<void> {
  const token = await auth.getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  if (!auth.activeOrgId) {
    throw new Error("No workspace selected");
  }

  await fetchEventSource(`${getApiUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    method: "POST",
    signal: auth.signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
      [FORGE_ACTIVE_ORG_HEADER]: auth.activeOrgId,
    },
    body: JSON.stringify(body),
    openWhenHidden: true,
    onmessage(ev) {
      if (!ev.event || !ev.data) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data) as unknown;
      } catch {
        return;
      }
      void onMessage(ev.event, parsed);
    },
    onerror(err) {
      if (auth.signal?.aborted) return;
      console.error("Studio SSE:", err);
      // Stop infinite retry; callers can show reconnect UI.
      throw err instanceof Error ? err : new Error(String(err));
    },
  });
}
