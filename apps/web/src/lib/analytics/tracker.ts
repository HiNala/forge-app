"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAnalyticsTrackUrl } from "@/lib/api-url";

type TrackPayload = Record<string, unknown>;

const Q: { event_type: string; metadata: TrackPayload; client_event_id: string }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function clientEventId(): string {
  return crypto.randomUUID();
}

async function flushBatch() {
  if (!Q.length) return;
  const batch = Q.splice(0, 20);
  const body = JSON.stringify({ events: batch });
  try {
    await fetch(getAnalyticsTrackUrl(), {
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

/**
 * Dashboard / app-shell analytics batcher. Uses `getAnalyticsTrackUrl()` so the path never
 * double-appends `/api/v1` when `NEXT_PUBLIC_API_URL` includes that suffix (AL-01).
 */
export function useAnalytics() {
  const pathname = usePathname();
  const schedule = useCallback(() => {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushBatch();
    }, 2000);
  }, []);

  const track = useCallback(
    (eventType: string, metadata?: TrackPayload) => {
      Q.push({
        event_type: eventType,
        metadata: metadata ?? {},
        client_event_id: clientEventId(),
      });
      if (Q.length >= 10) void flushBatch();
      else schedule();
    },
    [schedule],
  );

  useEffect(() => {
    track("dashboard_view", { route: pathname, surface: "web_app" });
  }, [pathname, track]);

  return { track };
}
