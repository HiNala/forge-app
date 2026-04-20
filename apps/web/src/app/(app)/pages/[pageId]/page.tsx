"use client";

import { useAuth } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ExternalLink, Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ensureBridgeInFullDocument } from "@/lib/studio-preview-html";
import { listPageSubmissions } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { usePageDetail } from "@/providers/page-detail-provider";

export default function PageOverviewTab() {
  const { page } = usePageDetail();
  const { getToken } = useAuth();
  const { activeOrganizationId, activeOrg } = useForgeSession();

  const qRecent = useQuery({
    queryKey: ["page-overview-subs", activeOrganizationId, page.id],
    queryFn: () => listPageSubmissions(getToken, activeOrganizationId, page.id, { limit: 5 }),
    enabled: !!activeOrganizationId,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl =
    activeOrg?.organization_slug && page.slug
      ? `${origin}/p/${activeOrg.organization_slug}/${page.slug}`
      : "";

  const iframeSrc = ensureBridgeInFullDocument(page.current_html || "<p>No content yet.</p>", origin);
  const recentItems = qRecent.data?.items ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Main column */}
      <div className="space-y-6">
        {/* Preview */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="section-label">Live preview</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => {
                if (!publicUrl) return;
                window.open(
                  page.status === "live" ? publicUrl : `${publicUrl}?preview=true`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
            >
              <ExternalLink className="size-3.5" />
              Open in new tab
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-border bg-bg-elevated px-3 py-2">
              <span className="flex gap-1" aria-hidden>
                <span className="size-2 rounded-full bg-red-400/70" />
                <span className="size-2 rounded-full bg-amber-400/70" />
                <span className="size-2 rounded-full bg-emerald-400/70" />
              </span>
              <span className="truncate font-body text-[11px] text-text-subtle">
                {publicUrl || "Preview"}
              </span>
            </div>
            <iframe
              title="Page preview"
              aria-label="Live page preview"
              className="aspect-[16/10] min-h-[320px] w-full border-0 bg-white"
              srcDoc={iframeSrc}
              sandbox="allow-forms allow-same-origin allow-scripts"
            />
          </div>
        </div>

        {/* Recent submissions */}
        <section aria-labelledby="recent-submissions-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-submissions-heading" className="font-display text-base font-bold text-text">
              Recent submissions
            </h2>
            <Link
              href={`/pages/${page.id}/submissions`}
              className="font-body text-sm text-text-muted underline-offset-4 hover:text-text hover:underline transition-colors"
            >
              View all →
            </Link>
          </div>

          {recentItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
              <p className="font-body text-sm text-text-muted">No submissions yet.</p>
              <p className="mt-1 font-body text-xs text-text-subtle">
                Share your page link and they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface overflow-hidden">
              {recentItems.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-body text-sm font-bold text-text">
                      {s.submitter_name ?? "Anonymous"}
                    </p>
                    <p className="truncate font-body text-xs text-text-muted">{s.submitter_email ?? "—"}</p>
                  </div>
                  <p className="shrink-0 font-body text-xs text-text-subtle">
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 rounded-2xl border border-border bg-surface p-5 self-start">
        <span className="section-label">Snapshot</span>

        <dl className="space-y-4 font-body">
          <div>
            <dt className="text-xs text-text-subtle">Submissions</dt>
            <dd className="mt-0.5 font-display text-2xl font-bold text-text">
              {qRecent.isLoading ? "…" : (recentItems.length ?? 0)}
            </dd>
          </div>
          <div className="border-t border-border pt-4">
            <dt className="text-xs text-text-subtle">Last submission</dt>
            <dd className="mt-0.5 text-sm font-bold text-text">
              {recentItems[0]
                ? formatDistanceToNow(new Date(recentItems[0].created_at), { addSuffix: true })
                : "—"}
            </dd>
          </div>
          <div className="border-t border-border pt-4">
            <dt className="text-xs text-text-subtle mb-1.5">Page URL</dt>
            <dd className="break-all font-mono text-[11px] text-text-muted leading-relaxed">{publicUrl || "—"}</dd>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2 gap-1.5 w-full"
              disabled={!publicUrl}
              onClick={() => {
                void navigator.clipboard.writeText(publicUrl).then(() => toast.success("Link copied"));
              }}
            >
              <Link2 className="size-3.5" />
              Copy link
            </Button>
          </div>
        </dl>

        <div className="border-t border-border pt-4">
          <p className="font-body text-xs text-text-subtle">
            Share this link and activity will appear above as people respond.
          </p>
        </div>
      </aside>
    </div>
  );
}
