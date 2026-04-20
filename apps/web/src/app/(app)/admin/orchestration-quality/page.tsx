"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";

import { adminOrchestrationQuality, type OrchestrationQualityOut } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrchestrationQualityPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const [data, setData] = React.useState<OrchestrationQualityOut | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeOrganizationId) return;
    let cancelled = false;
    void (async () => {
      try {
        const d = await adminOrchestrationQuality(getToken, activeOrganizationId);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, activeOrganizationId]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">Orchestration quality</h1>
      <p className="text-sm text-text-muted">
        Aggregates from persisted review runs (Mission O-04). Requires Forge operator access.
      </p>
      {err && <p className="text-sm text-danger">{err}</p>}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last 800 runs with review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-text-muted">Samples:</span> {data.samples_with_review}
            </p>
            <p>
              <span className="text-text-muted">Avg quality score:</span>{" "}
              {data.avg_quality_score != null ? data.avg_quality_score.toFixed(1) : "—"}
            </p>
            <p>
              <span className="text-text-muted">Total orchestration runs:</span>{" "}
              {data.orchestration_runs_total}
            </p>
            <div className="pt-2">
              <p className="text-text-muted mb-1">By workflow</p>
              <ul className="list-inside list-disc space-y-1">
                {Object.entries(data.avg_by_workflow).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v.toFixed(1)}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
