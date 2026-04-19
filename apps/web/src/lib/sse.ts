import { fetchEventSource } from "@microsoft/fetch-event-source";

import { FORGE_ACTIVE_ORG_HEADER, getApiUrl } from "./api";

type AuthOpts = {
  getToken: () => Promise<string | null>;
  activeOrgId: string | null;
};

/**
 * Authenticated Studio SSE (generate, refine, etc.) — sends Bearer + org header.
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
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
      [FORGE_ACTIVE_ORG_HEADER]: auth.activeOrgId,
    },
    body: JSON.stringify(body),
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
      console.error("Studio SSE:", err);
      throw err;
    },
  });
}
