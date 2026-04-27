"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getBillingUsage, type BillingUsageOut } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { formatSessionResetsIn } from "@/lib/usage-credits";
import { cn } from "@/lib/utils";

function segmentClass(filled: boolean, highStress: boolean) {
  return cn(
    "h-2.5 w-1 rounded-sm border border-border",
    filled
      ? highStress
        ? "bg-orange-500"
        : "bg-accent"
      : "bg-bg-elevated",
  );
}

/**
 * Top-bar battery + tooltip; click through to full usage settings.
 */
export function SessionUsageBattery({ className }: { className?: string }) {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const q = useQuery({
    queryKey: ["billing-usage", activeOrganizationId],
    queryFn: () => getBillingUsage(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
    staleTime: 30_000,
  });
  const u: BillingUsageOut | undefined = q.data;
  if (!u || (u.credits_session_cap ?? 0) <= 0) return null;
  const pct = Math.min(100, u.credits_session_percent);
  const segs = 4;
  const raw = Math.round((pct / 100) * segs);
  const filled =
    pct <= 0 ? 0 : Math.max(1, Math.min(segs, raw > 0 ? raw : 1));
  const highStress = pct >= 90;
  const detail = `Session: ${u.credits_session_used.toLocaleString()} / ${u.credits_session_cap.toLocaleString()} credits. ${formatSessionResetsIn(u.credits_session_resets_at) ?? "Rolling 5 h session"}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/settings/usage"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md p-1.5 text-left transition-colors hover:bg-bg-elevated",
            className,
          )}
          aria-label={`Session credit usage, ${Math.round(pct)} percent — open usage settings`}
        >
          <span className="flex gap-0.5" aria-hidden>
            {Array.from({ length: segs }, (_, i) => (
              <span key={i} className={segmentClass(i < filled, highStress)} />
            ))}
          </span>
          <span className="hidden font-body text-xs font-medium tabular-nums text-text-muted sm:inline">
            {Math.round(pct)}%
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs font-body text-xs">
        {detail} — click for usage details
      </TooltipContent>
    </Tooltip>
  );
}
