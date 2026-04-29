"use client";

import { WebCanvas } from "@/components/web-canvas";

export function StudioWebCanvasShell({ projectId }: { projectId: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border bg-surface/80 px-4 py-2 backdrop-blur">
        <h1 className="font-body text-sm font-semibold text-text">Web and website</h1>
        <p className="text-[12px] text-text-muted">
          {projectId === "new"
            ? "Prototype multi-page flows locally — pass a canvas project UUID in the URL to hydrate from the API."
            : "Route loads web canvas; API hydration follows the same pattern as mobile."}
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <WebCanvas projectId={projectId} />
      </div>
    </div>
  );
}
