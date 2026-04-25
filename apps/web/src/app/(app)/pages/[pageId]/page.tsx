"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, Copy, ExternalLink, Mail, Link as LinkIcon, Bell } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { listPageSubmissions, getPageAutomations } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { usePageDetail } from "@/providers/page-detail-provider";

const FORM_TYPES = new Set(["booking-form", "contact-form", "rsvp", "booking", "contact"]);

function isFormPage(pageType: string) {
  return FORM_TYPES.has(pageType) || pageType.includes("form") || pageType.includes("booking") || pageType.includes("contact");
}

export default function PageShareTab() {
  const { page } = usePageDetail();
  const { getToken } = useAuth();
  const { activeOrganizationId, activeOrg } = useForgeSession();
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [embedCopied, setEmbedCopied] = React.useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl =
    activeOrg?.organization_slug && page.slug
      ? `${origin}/p/${activeOrg.organization_slug}/${page.slug}`
      : "";

  const embedCode = publicUrl
    ? `<iframe src="${publicUrl}" width="100%" height="600" frameborder="0"></iframe>`
    : "";

  const qRecent = useQuery({
    queryKey: ["page-overview-subs", activeOrganizationId, page.id],
    queryFn: () =>
      listPageSubmissions(getToken, activeOrganizationId, page.id, { limit: 5 }),
    enabled: !!activeOrganizationId,
  });
  const recentItems = qRecent.data?.items ?? [];

  const qAutoRules = useQuery({
    queryKey: ["automations", activeOrganizationId, page.id],
    queryFn: () => getPageAutomations(getToken, activeOrganizationId, page.id),
    enabled: !!activeOrganizationId && isFormPage(page.page_type),
    staleTime: 60_000,
  });

  const notifyEmpty =
    isFormPage(page.page_type) &&
    qAutoRules.data &&
    (qAutoRules.data.notify_emails ?? []).length === 0 &&
    !qAutoRules.data.confirm_submitter;

  function copyLink() {
    if (!publicUrl) return;
    void navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2200);
    });
  }

  function copyEmbed() {
    if (!embedCode) return;
    void navigator.clipboard.writeText(embedCode).then(() => {
      setEmbedCopied(true);
      toast.success("Embed code copied");
      setTimeout(() => setEmbedCopied(false), 2200);
    });
  }

  return (
    <div className="space-y-5">
      {/* Notification nudge for form pages with no email setup */}
      {notifyEmpty ? (
        <button
          type="button"
          onClick={() => router.push(`/pages/${page.id}/automations`)}
          className="w-full flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-light/40 px-3.5 py-3 text-left transition-colors hover:bg-accent-light/70"
        >
          <Bell className="size-4 shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-body text-[12px] font-semibold text-accent">
              Set up email notifications
            </p>
            <p className="font-body text-[11px] text-accent/70">
              Get notified when someone fills out this form
            </p>
          </div>
          <span className="font-body text-[11px] text-accent/70 shrink-0">→</span>
        </button>
      ) : null}

      {/* Page link */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="section-label">Page link</p>
          {page.status !== "live" ? (
            <span className="font-body text-[10px] font-semibold uppercase tracking-wide text-warning">
              Draft
            </span>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <div
            className="flex-1 min-w-0 truncate rounded-lg border border-border bg-bg px-3 py-2 font-body text-[12px] text-text-muted"
            title={publicUrl || "No URL yet"}
          >
            {publicUrl || "—"}
          </div>
          <button
            type="button"
            onClick={copyLink}
            disabled={!publicUrl}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 font-body text-[12px] font-semibold transition-all"
            style={{
              background: copied ? "var(--color-success)" : "var(--color-text)",
              color: copied ? "#fff" : "var(--color-bg)",
              border: copied ? "1px solid transparent" : "none",
              opacity: !publicUrl ? 0.4 : 1,
              cursor: !publicUrl ? "not-allowed" : "pointer",
            }}
          >
            {copied ? (
              <>
                <Check className="size-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Embed code */}
      <div>
        <p className="section-label mb-2">Embed</p>
        <div
          className="rounded-lg border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-text-muted break-all cursor-pointer transition-colors hover:border-accent hover:text-text"
          title="Click to copy embed code"
          onClick={copyEmbed}
        >
          {embedCode || '<iframe src="…" />'}
        </div>
        {embedCopied && (
          <p className="mt-1 font-body text-[10px] text-success">Copied to clipboard</p>
        )}
      </div>

      {/* Share actions */}
      <div>
        <p className="section-label mb-2">Share via</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            {
              label: "Email",
              icon: <Mail className="size-3.5" />,
              onClick: () => {
                if (!publicUrl) return;
                window.location.href = `mailto:?subject=Check+this+out&body=${encodeURIComponent(publicUrl)}`;
              },
            },
            {
              label: "Copy link",
              icon: <LinkIcon className="size-3.5" />,
              onClick: copyLink,
            },
            {
              label: "New tab",
              icon: <ExternalLink className="size-3.5" />,
              onClick: () => {
                if (!publicUrl) return;
                window.open(publicUrl, "_blank", "noopener,noreferrer");
              },
            },
          ].map(({ label, icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              disabled={!publicUrl}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-bg py-2.5 text-text-muted transition-all hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed font-body text-[11px] font-medium"
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot */}
      <div className="rounded-2xl border border-border bg-bg-elevated p-4 space-y-3">
        <p className="section-label">Snapshot</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="font-body text-[10px] text-text-muted mb-1">Submissions</p>
            <p
              className="font-display font-bold text-text"
              style={{ fontSize: "20px", letterSpacing: "-0.01em" }}
            >
              {qRecent.isLoading ? "…" : recentItems.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="font-body text-[10px] text-text-muted mb-1">Last response</p>
            <p className="font-body text-[12px] font-semibold text-text truncate">
              {recentItems[0]
                ? formatDistanceToNow(new Date(recentItems[0].created_at), {
                    addSuffix: true,
                  })
                : "—"}
            </p>
          </div>
        </div>

        {recentItems.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
            {recentItems.slice(0, 3).map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-[12px] font-semibold text-text">
                    {s.submitter_name ?? "Anonymous"}
                  </p>
                  <p className="truncate font-body text-[10px] text-text-muted">
                    {s.submitter_email ?? "—"}
                  </p>
                </div>
                <p className="shrink-0 font-body text-[10px] text-text-subtle">
                  {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
