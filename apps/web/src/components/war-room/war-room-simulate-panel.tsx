"use client";

import { Button } from "@/components/ui/button";

/** Placeholder shell — persona simulation attaches when BP-04 credit estimates land. */
export function WarRoomSimulatePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed bottom-24 right-6 z-[55] max-w-sm rounded-xl border border-border bg-surface p-4 shadow-xl">
      <p className="font-body text-sm font-semibold text-text">Simulate mode</p>
      <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
        Synthetic personas iterate your flow server-side — results paint heatmaps on the canvas. Credits and persistence ship
        in the simulate milestone.
      </p>
      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
