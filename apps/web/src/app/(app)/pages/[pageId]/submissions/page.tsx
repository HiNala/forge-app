"use client";

import { Suspense } from "react";
import { SubmissionsPanel } from "@/components/submissions/submissions-panel";

function SubmissionsRouteInner() {
  return <SubmissionsPanel />;
}

export default function PageSubmissionsRoute() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-text-muted font-body" role="status">
          Loading submissions…
        </div>
      }
    >
      <SubmissionsRouteInner />
    </Suspense>
  );
}
