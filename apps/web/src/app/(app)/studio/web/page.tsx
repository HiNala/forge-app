import type { Metadata } from "next";
import { WebCanvas } from "@/components/web-canvas";

export const metadata: Metadata = {
  title: "Web design & websites | Studio | Forge",
};

/**
 * P-03: web canvas with desktop / tablet / mobile previews per page. Single-page Studio workflows stay on /studio.
 */
export default function StudioWebPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border bg-surface/80 px-4 py-2 backdrop-blur">
        <h1 className="font-body text-sm font-semibold text-text">Web and website</h1>
        <p className="text-[12px] text-text-muted">
          Multi-breakpoint canvas. Add pages, edit site nav, then marquee a region with{" "}
          <span className="text-text">M</span>, the toolbar, or ⌘/Ctrl-drag on a preview to scope a refine.{" "}
          <span className="text-text">Single-page builds</span> still use the main Studio.
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <WebCanvas />
      </div>
    </div>
  );
}
