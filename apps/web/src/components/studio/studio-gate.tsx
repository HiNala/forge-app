"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { resolveStudioWarRoomLayout } from "@/lib/war-room-feature";
import { useForgeSession } from "@/providers/session-provider";

export function StudioGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me, isLoading } = useForgeSession();
  const redirected = React.useRef(false);

  const legacy = searchParams.get("legacy") === "1" || searchParams.get("war_room") === "0";
  const prefs = (me?.preferences ?? null) as Record<string, unknown> | null;
  const warp =
    !legacy &&
    prefs &&
    resolveStudioWarRoomLayout(prefs, { isPlatformAdmin: me?.user?.is_platform_admin === true });

  React.useEffect(() => {
    if (!warp || isLoading || redirected.current) return;
    redirected.current = true;
    const qs = new URLSearchParams();
    searchParams.forEach((v, k) => {
      if (k === "legacy" || k === "war_room") return;
      qs.set(k, v);
    });
    const pageId = qs.get("pageId");
    if (!qs.get("stage")) qs.set("stage", "design");
    const tail = qs.toString() ? `?${qs}` : "";
    if (pageId) router.replace(`/studio/war-room/${encodeURIComponent(pageId)}${tail}`);
    else router.replace(`/studio/war-room/new${tail}`);
  }, [isLoading, router, searchParams, warp]);

  if (isLoading || !me) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-body text-sm text-text-muted" role="status">
        Opening Studio…
      </div>
    );
  }

  if (warp) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-body text-sm text-text-muted" role="status">
        Opening War Room…
      </div>
    );
  }

  return <StudioWorkspace />;
}
