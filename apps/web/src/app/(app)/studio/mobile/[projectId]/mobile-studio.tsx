"use client";

import { MobileCanvas } from "@/components/mobile-canvas";

export function StudioMobileCanvasShell({ projectId }: { projectId: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border bg-surface/80 px-4 py-2 backdrop-blur">
        <h1 className="font-body text-sm font-semibold text-text">Mobile app design</h1>
        <p className="text-[12px] text-text-muted">
          {projectId === "new"
            ? "Start from a demo layout — wire your project UUID route to hydrate from the API (`/studio/mobile/{uuid}`)."
            : "Hydrated from API when available — dragged frames debounce-save position."}{" "}
          Marquee: M or toolbar.
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <MobileCanvas projectId={projectId} />
      </div>
    </div>
  );
}
