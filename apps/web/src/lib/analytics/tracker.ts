"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

type TrackPayload = Record<string, unknown>;

const Q: { event_type: string; metadata: TrackPayload; client_event_id: string }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function clientEventId(): string {
  return crypto.randomUUID();
}

async function flushBatch(apiBase: string) {
  if (!Q.length) return;
  const batch = Q.splice(0, 20);
  const body = JSON.stringify({ events: batch });
  try {
    await fetch(`${apiBase}/api/v1/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include",
      keepalive: true,
    });
  } catch {
    /* retry next flush */
  }
}

export function useAnalytics(apiBase: string) {
  const pathname = usePathname();
  const schedule = useCallback(() => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushBatch(apiBase);
    }, 2000);
  }, [apiBase]);

  const track = useCallback(
    (eventType: string, metadata?: TrackPayload) => {
      Q.push({
        event_type: eventType,
        metadata: metadata ?? {},
        client_event_id: clientEventId(),
      });
      if (Q.length >= 10) void flushBatch(apiBase);
      else schedule();
    },
    [apiBase, schedule]
  );

  useEffect(() => {
    // `page_view` requires `page_id` in metadata. Shell navigation uses `dashboard_view`.
    track("dashboard_view", { route: pathname, surface: "web_app" });
  }, [pathname, track]);

  return { track };
}
