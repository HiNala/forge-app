"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { getBrand, listPages } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

const SEEN_KEY = (orgId: string) => `forge-onboarding-seen-${orgId}`;

/**
 * New workspaces need onboarding when there is no primary brand color yet **and** no pages.
 * Skip when the user dismissed the flow once for this org (`sessionStorage`).
 */
export function OnboardingGate() {
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { activeOrganizationId, isLoading: sessionLoading } = useForgeSession();

  const brandQuery = useQuery({
    queryKey: ["brand", activeOrganizationId],
    enabled: !!activeOrganizationId && !sessionLoading,
    queryFn: () => getBrand(getToken, activeOrganizationId),
  });

  const pagesQuery = useQuery({
    queryKey: ["pages", activeOrganizationId],
    enabled: !!activeOrganizationId && !sessionLoading,
    queryFn: () => listPages(getToken, activeOrganizationId),
  });

  React.useEffect(() => {
    if (!activeOrganizationId || sessionLoading) return;
    if (!brandQuery.isFetched || !pagesQuery.isFetched) return;
    if (pathname?.startsWith("/onboarding")) return;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SEEN_KEY(activeOrganizationId))) {
        return;
      }
    } catch {
      /* ignore */
    }
    const brand = brandQuery.data;
    const pages = pagesQuery.data ?? [];
    const needsOnboard =
      !brand?.primary_color && pages.length === 0;
    if (needsOnboard) {
      router.replace("/onboarding");
    }
  }, [
    activeOrganizationId,
    sessionLoading,
    brandQuery.isFetched,
    brandQuery.data,
    pagesQuery.isFetched,
    pagesQuery.data,
    pathname,
    router,
  ]);

  return null;
}

export function markOnboardingSeen(orgId: string) {
  try {
    sessionStorage.setItem(SEEN_KEY(orgId), "1");
  } catch {
    /* ignore */
  }
}
