"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import { useGlideDesignSession } from "@/providers/session-provider";
import { formatSessionResetsIn } from "@/lib/usage-credits";
import { cn } from "@/lib/utils";
import { getBillingUsage } from "@/lib/api";
import { UsageBar } from "@/components/usage/UsageBar";
import Link from "next/link";

type Props = {
  className?: string;
  active?: boolean;
  /** BP-04 — provisional running total credits from SSE during streaming. */
  streamingRunCredits?: number;
};

/** Studio footer: session credits — compact row; click “Details” for the same bar pattern as Settings. */
export function StudioSessionUsageStrip({
  className,
  active: studioActive = true,
  streamingRunCredits,
}: Props) {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useGlideDesignSession();
  const q = useQuery({
    queryKey: ["billing-usage", activeOrganizationId],
    queryFn: () => getBillingUsage(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId && studioActive,
    staleTime: 15_000,
  });
  const u = q.data;
  if (!u || (u.credits_session_cap ?? 0) <= 0) return null;
  const pct = Math.min(100, u.credits_session_percent);
  const reset = formatSessionResetsIn(u.credits_session_resets_at) ?? "Resets on the next 5 h window";

  return (
    <div className={cn("border-t border-white/10 px-3 py-2.5", className)} role="status">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-white/50 font-body">Session</p>
        <Link
          href="/settings/usage"
          className="text-[11px] font-medium text-white/60 underline-offset-2 hover:text-white/90 hover:underline font-body"
        >
          View usage
        </Link>
      </div>
      <p className="mb-2 font-body text-[12px] leading-snug text-white/70">
        Session: {Math.round(pct)}% used · {reset}
      </p>
      <UsageBar
        variant="inverse"
        label="generation credits"
        percentUsed={pct}
        used={u.credits_session_used}
        cap={u.credits_session_cap}
        resetText={reset}
      />
      {typeof streamingRunCredits === "number" && streamingRunCredits > 0 ? (
        <p className="mt-2 font-body text-[11px] leading-snug text-white/65">
          This run ~<span className="tabular-nums">{streamingRunCredits}</span> credits accrued (streaming)
        </p>
      ) : null}
    </div>
  );
}
