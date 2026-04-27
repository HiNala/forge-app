import type { Metadata } from "next";
import { MobileCanvas } from "@/components/mobile-canvas";

export const metadata: Metadata = {
  title: "Mobile app design | Studio | Forge",
};

/**
 * P-02: canvas-first mobile screen workflow. Chat + orchestration wiring can extend this surface.
 */
export default function StudioMobilePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border bg-surface/80 px-4 py-2 backdrop-blur">
        <h1 className="font-body text-sm font-semibold text-text">Mobile app design</h1>
        <p className="text-[12px] text-text-muted">Pan, zoom, and arrange screens. Marquee: M or toolbar.</p>
      </header>
      <div className="min-h-0 flex-1">
        <MobileCanvas />
      </div>
    </div>
  );
}
