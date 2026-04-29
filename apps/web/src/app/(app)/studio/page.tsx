import type { Metadata } from "next";
import { Suspense } from "react";

import { StudioGate } from "@/components/studio/studio-gate";

export const metadata: Metadata = {
  title: "Studio | GlideDesign",
};

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-muted font-body">
          Loading Studio…
        </div>
      }
    >
      <StudioGate />
    </Suspense>
  );
}
