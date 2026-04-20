"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { listAutomationFailures } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

export default function AutomationNotificationsPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();

  const q = useQuery({
    queryKey: ["automation-failures", activeOrganizationId],
    queryFn: () => listAutomationFailures(getToken, activeOrganizationId, 30),
    enabled: !!activeOrganizationId,
  });

  if (!activeOrganizationId) {
    return (
      <p className="font-body text-sm text-text-muted">Choose a workspace to view automation issues.</p>
    );
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (q.isError) {
    return <p className="font-body text-sm text-danger">Could not load automation failures.</p>;
  }

  const rows = q.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-2xl font-bold text-text">Notifications</h1>
        <p className="font-body text-sm text-text-muted">No failed automation runs in the last 30 days.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Automation failures</h1>
        <p className="mt-1 font-body text-sm text-text-muted">
          Steps that did not complete (emails or calendar). Open the page&apos;s automations tab to retry
          individual runs.
        </p>
      </div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3 font-body text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-xs text-text-muted">{r.step}</span>
              <time className="text-xs text-text-muted" dateTime={r.ran_at}>
                {new Date(r.ran_at).toLocaleString()}
              </time>
            </div>
            {r.error_message ? (
              <p className="mt-2 text-xs text-danger" role="alert">
                {r.error_message}
              </p>
            ) : null}
            <p className="mt-2">
              <Link
                href={`/pages/${r.page_id}/automations`}
                className="text-sm font-semibold text-text underline-offset-4 hover:underline"
              >
                Open page automations
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
