"use client";

import { useAuth } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ExternalLink, Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ensureBridgeInFullDocument } from "@/lib/studio-preview-html";
import { getBrand, listPageSubmissions } from "@/lib/api";
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

  const qBrand = useQuery({
    queryKey: ["brand", activeOrganizationId],
    queryFn: () => getBrand(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl =
    activeOrg?.organization_slug && page.slug
      ? `${origin}/p/${activeOrg.organization_slug}/${page.slug}`
      : "";

  const iframeSrc = ensureBridgeInFullDocument(page.current_html || "<p>No content yet.</p>", origin);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text font-body">Live preview</p>
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
        <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-bg-elevated px-3 py-2">
            <span className="flex gap-1" aria-hidden>
              <span className="size-2 rounded-full bg-red-400/80" />
              <span className="size-2 rounded-full bg-amber-400/80" />
              <span className="size-2 rounded-full bg-emerald-400/80" />
            </span>
            <span className="truncate text-[11px] text-text-muted font-body">Preview</span>
          </div>
          <iframe
            title="Page preview"
            aria-label="Live page preview"
            className="aspect-[16/10] min-h-[320px] w-full border-0 bg-white"
            srcDoc={iframeSrc}
            sandbox="allow-forms allow-same-origin allow-scripts"
          />
        </div>

        <section aria-labelledby="recent-submissions-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-submissions-heading" className="font-display text-lg font-semibold text-text">
              Recent submissions
            </h2>
            <Link
              href={`/pages/${page.id}/submissions`}
              className="text-sm text-accent underline-offset-4 hover:underline font-body"
            >
              View all submissions →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(qRecent.data?.items ?? []).length === 0 ? (
              <p className="text-sm text-text-muted font-body">No submissions yet.</p>
            ) : (
              (qRecent.data?.items ?? []).map((s) => (
                <div
                  key={s.id}
                  className="min-w-[200px] rounded-lg border border-border bg-surface px-3 py-2 text-left shadow-sm"
                >
                  <p className="truncate text-sm font-medium text-text font-body">
                    {s.submitter_name ?? "Anonymous"}
                  </p>
                  <p className="truncate text-xs text-text-muted font-body">{s.submitter_email ?? "—"}</p>
                  <p className="mt-1 text-[11px] text-text-muted font-body">
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-4 rounded-[10px] border border-border bg-surface p-4">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
          Snapshot
        </h2>
        <dl className="space-y-3 text-sm font-body">
          <div>
            <dt className="text-text-muted">Views this month</dt>
            <dd className="font-medium text-text">—</dd>
          </div>
          <div>
            <dt className="text-text-muted">Submissions this month</dt>
            <dd className="font-medium text-text">{qRecent.data?.items.length ?? "…"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Last submission</dt>
            <dd className="font-medium text-text">
              {qRecent.data?.items[0]
                ? formatDistanceToNow(new Date(qRecent.data.items[0].created_at), { addSuffix: true })
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Current URL</dt>
            <dd className="break-all font-mono text-xs text-text">{publicUrl || "—"}</dd>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2 gap-1"
              disabled={!publicUrl}
              onClick={() => {
                void navigator.clipboard.writeText(publicUrl).then(() => toast.success("Link copied"));
              }}
            >
              <Link2 className="size-3.5" />
              Copy link
            </Button>
          </div>
          <div>
            <dt className="text-text-muted">Brand accent</dt>
            <dd>
              <span
                className="inline-block size-6 rounded border border-border"
                style={{ background: qBrand.data?.primary_color ?? "#ccc" }}
                title={qBrand.data?.primary_color ?? ""}
              />
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border border-dashed border-border bg-bg-elevated/50 p-3 text-sm text-text-muted font-body">
          <p className="font-medium text-text">Share your page</p>
          <p className="mt-1 text-xs">
            Send this link by email or text — activity will show up here as people respond.
          </p>
        </div>
      </aside>
    </div>
  );
}
