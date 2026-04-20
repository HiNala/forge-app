import { Suspense } from "react";

import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-bg-elevated" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[220px] animate-pulse rounded-2xl bg-bg-elevated" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardView />
    </Suspense>
  );
}
