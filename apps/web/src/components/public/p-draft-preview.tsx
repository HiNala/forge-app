"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import Link from "next/link";
import * as React from "react";
import { getPage, listPages } from "@/lib/api";
import { ensureBridgeInFullDocument } from "@/lib/studio-preview-html";
import { useForgeSession } from "@/providers/session-provider";

type Props = { orgSlug: string; pageSlug: string };

/**
 * Authenticated draft preview — `?preview=true` on `/p/{org}/{slug}`.
 * Validates org membership and loads current_html via tenant API.
 */
export function PDraftPreview({ orgSlug, pageSlug }: Props) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { me, activeOrganizationId, activeOrg } = useForgeSession();
  const [html, setHtml] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const membership = me?.memberships.find((m) => m.organization_slug === orgSlug);
  const orgId = membership?.organization_id ?? (activeOrg?.organization_slug === orgSlug ? activeOrganizationId : null);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !orgId) return;
    let cancelled = false;
    void (async () => {
      try {
        const pages = await listPages(getToken, orgId);
        const hit = pages.find((p) => p.slug === pageSlug);
        if (!hit) {
          setErr("Page not found in this workspace.");
          return;
        }
        const detail = await getPage(getToken, orgId, hit.id);
        if (cancelled) return;
        const origin = window.location.origin;
        setHtml(ensureBridgeInFullDocument(detail.current_html || "", origin));
      } catch {
        if (!cancelled) setErr("Could not load draft preview.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, orgId, getToken, pageSlug]);

  if (!isLoaded) {
    return <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading…</div>;
  }
  if (!isSignedIn) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-neutral-600">Sign in to preview this draft.</p>
        <Link href="/signin" className="text-sm text-blue-600 underline">
          Sign in
        </Link>
      </div>
    );
  }
  if (!membership && activeOrg?.organization_slug !== orgSlug) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center text-sm text-neutral-600">
        You don&apos;t have access to this workspace.
      </div>
    );
  }
  if (err) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center text-sm text-red-600">
        {err}
      </div>
    );
  }
  if (!html) {
    return <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading preview…</div>;
  }

  return (
    <iframe
      title="Draft preview"
      aria-label="Live page preview"
      className="h-screen w-full border-0 bg-white"
      srcDoc={html}
      sandbox="allow-forms allow-scripts"
    />
  );
}
