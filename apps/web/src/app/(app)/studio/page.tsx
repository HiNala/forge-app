import type { Metadata } from "next";
import { Suspense } from "react";

import { StudioWorkspace } from "@/components/studio/studio-workspace";

export const metadata: Metadata = {
  title: "Studio | Forge",
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
      <StudioWorkspace />
    </Suspense>
  );
}
