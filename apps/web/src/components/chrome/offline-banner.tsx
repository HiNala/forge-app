"use client";

import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const qc = useQueryClient();

  if (online) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-wrap items-center justify-center gap-3 border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-text font-body"
    >
      <WifiOff className="size-4 shrink-0 text-warning" aria-hidden />
      <span>
        We can&apos;t reach Forge right now — check your connection. Your edits stay on this device until you&apos;re
        back online.
      </span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          void qc.invalidateQueries();
        }}
      >
        Retry sync
      </Button>
    </div>
  );
}
