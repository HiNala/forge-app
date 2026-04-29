"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getAdminPatternsFeed, getPlatformSession } from "@/lib/api";

export default function AdminPatternsPage() {
  const { getToken } = useAuth();

  const sessionQ = useQuery({
    queryKey: ["platform-session"],
    queryFn: () => getPlatformSession(getToken),
  });

  const feedQ = useQuery({
    queryKey: ["admin-patterns-feed"],
    queryFn: () => getAdminPatternsFeed(getToken, 7),
    enabled: sessionQ.isSuccess && !!sessionQ.data,
  });

  if (sessionQ.isLoading || !sessionQ.data) {
    return <p className="font-body text-sm text-text-muted">Checking admin access…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Patterns</h1>
        <p className="mt-2 max-w-prose font-body text-sm text-text-muted">
          Rolling founder view of thumbs-down themes and verbatim snippets (respecting per-user telemetry opt-outs).
          Pair with recurring groups and orchestration traces to decide prompt edits.
        </p>
      </div>
      {feedQ.isLoading ? (
        <p className="text-sm text-text-muted">Loading feed…</p>
      ) : feedQ.error ? (
        <p className="text-sm text-danger">Unable to load feed — check platform permissions.</p>
      ) : (
        <ul className="space-y-2">
          {(feedQ.data?.items ?? []).map((item, idx) => {
            const row = item as { id?: string; artifact_kind?: string };
            return (
              <li
                key={row.id ?? `${row.artifact_kind ?? "x"}-${idx}`}
                className="rounded-lg border border-border bg-surface px-3 py-2 font-body text-xs text-text"
              >
              <span className="font-semibold">{(item as { artifact_kind?: string }).artifact_kind ?? "?"}</span>{" "}
              <span className="text-text-muted">
                {(item as { sentiment?: string }).sentiment} · {(item as { action_taken?: string }).action_taken}
              </span>
              {(item as { free_text?: string }).free_text ? (
                <p className="mt-1 text-text-muted">“{(item as { free_text?: string }).free_text}”</p>
              ) : null}
            </li>
            );
          })}
        </ul>
      )}
      <p className="font-body text-xs text-text-muted">
        API: GET <code>/api/v1/admin/patterns/feed</code>. For drill-down, open an{" "}
        <Link href="/admin/orchestration-quality" className="text-accent hover:underline">
          orchestration run
        </Link>
        .
      </p>
    </div>
  );
}
