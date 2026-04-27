"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getBillingUsage } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { formatSessionResetsIn } from "@/lib/usage-credits";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  active?: boolean;
};

/** Slim footer strip for Studio chat — session Forge Credits, always visible in active mode. */
export function StudioSessionUsageStrip({ className, active: studioActive = true }: Props) {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const q = useQuery({
    queryKey: ["billing-usage", activeOrganizationId],
    queryFn: () => getBillingUsage(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId && studioActive,
    staleTime: 15_000,
  });
  const u = q.data;
  if (!u || (u.credits_session_cap ?? 0) <= 0) return null;
  const pct = Math.min(100, u.credits_session_percent);
  const band = pct >= 100 ? "limit" : pct >= 90 ? "90" : pct >= 70 ? "70" : "ok";

  return (
    <div
      className={cn("border-t border-white/10 px-3 py-2", className)}
      role="status"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-white/45 font-body">
          Session usage
        </p>
        <Link
          href="/settings/usage"
          className="text-[10px] text-accent/90 underline-offset-2 hover:underline font-body"
        >
          Details
        </Link>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full",
            band === "limit" && "bg-red-500/80",
            band === "90" && "bg-orange-400",
            band === "70" && "bg-amber-400",
            band === "ok" && "bg-accent",
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-white/50 font-body">
        {u.credits_session_used.toLocaleString()} / {u.credits_session_cap.toLocaleString()} ·{" "}
        {formatSessionResetsIn(u.credits_session_resets_at) ?? "5 h window"}
      </p>
    </div>
  );
}
