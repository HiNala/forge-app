"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import { listPages } from "@/lib/api";
import { useGlideDesignSession } from "@/providers/session-provider";
import { Button } from "@/components/ui/button";

export default function WarRoomNewPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useGlideDesignSession();
  const q = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  if (!activeOrganizationId) {
    return (
      <div className="war-room-root mx-auto max-w-xl space-y-6 p-8 font-body text-[14px] text-[var(--wr-muted)]" role="status">
        Select a workspace to open the Product War Room.
      </div>
    );
  }

  return (
    <div className="war-room-root mx-auto max-w-xl space-y-6 p-8">
      <h1 className="font-display text-2xl font-bold text-[var(--wr-fg)]">What are you building?</h1>
      <p className="text-[14px] leading-relaxed text-[var(--wr-muted)]">
        The Product War Room is project-scoped. Start from any GlideDesign page: Strategy, Canvas, and System planes stay in sync
        with orchestration streams.
      </p>
      <div className="rounded-2xl border border-[var(--wr-border)] bg-[color-mix(in_oklch,var(--wr-surface)_96%,transparent)] p-5">
        <p className="text-[13px] font-semibold text-[var(--wr-fg)]">Choose a GlideDesign page</p>
        {q.isLoading ? (
          <p className="mt-3 text-[13px] text-[var(--wr-muted)]" role="status">
            Loading…
          </p>
        ) : q.error || !q.data?.length ? (
          <div className="mt-4 space-y-4">
            <p className="text-[13px] text-[var(--wr-muted)]">No pages yet. Draft once in GlideDesign, then reopen here.</p>
            <Button type="button" variant="secondary" size="sm" asChild className="border-[var(--wr-border)]">
              <Link href="/studio?legacy=1">Open classic Studio</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {q.data.slice(0, 20).map((p) => (
              <li key={p.id}>
                <Link
                  className="block rounded-xl border border-[var(--wr-border)] bg-white/70 px-3 py-2 text-[13px] font-medium hover:border-[var(--wr-copper)] dark:bg-black/35"
                  href={`/studio/war-room/${p.id}?stage=idea`}
                >
                  <span className="text-[var(--wr-fg)]">{p.title || "Untitled"}</span>
                  <span className="ml-2 font-body text-[11px] text-[var(--wr-muted)]">{p.page_type}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[12px] text-[var(--wr-muted)]">
        Prefer Claude-style chat-first flow?{" "}
        <Link href="/studio?legacy=1" className="font-semibold text-[var(--wr-copper)] underline-offset-4 hover:underline">
          Use classic Studio
        </Link>
        .
      </p>
    </div>
  );
}
