"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function CalendarPopupCloseInner() {
  const sp = useSearchParams();

  useEffect(() => {
    const err = sp.get("error");
    const provider = sp.get("provider") ?? "google";
    const pageId = sp.get("page_id");
    if (window.opener) {
      if (err) {
        window.opener.postMessage(
          { type: "forge:calendar", status: "error", provider, error: err, pageId },
          "*",
        );
      } else {
        window.opener.postMessage(
          { type: "forge:calendar", status: "connected", provider, pageId },
          "*",
        );
      }
    }
    const t = window.setTimeout(() => {
      try {
        window.close();
      } catch {
        /* ignore */
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [sp]);

  return (
    <p className="p-8 text-center text-sm text-text-muted font-body">
      {sp.get("error") ? "Connection did not complete. You can close this window." : "Connected. Closing…"}
    </p>
  );
}

export default function CalendarPopupClosePage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-text-muted">Loading…</p>}>
      <CalendarPopupCloseInner />
    </Suspense>
  );
}
