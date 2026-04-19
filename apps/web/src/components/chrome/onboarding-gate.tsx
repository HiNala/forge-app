"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { getBrand } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

const SEEN_KEY = (orgId: string) => `forge-onboarding-seen-${orgId}`;

/**
 * Sends new workspaces to onboarding until they set a primary brand color or dismiss once.
 */
export function OnboardingGate() {
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { activeOrganizationId, isLoading: sessionLoading } = useForgeSession();

  const { data: brand, isFetched } = useQuery({
    queryKey: ["brand", activeOrganizationId],
    enabled: !!activeOrganizationId && !sessionLoading,
    queryFn: () => getBrand(getToken, activeOrganizationId),
  });

  React.useEffect(() => {
    if (!activeOrganizationId || sessionLoading || !isFetched || !brand) return;
    if (pathname?.startsWith("/onboarding")) return;
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SEEN_KEY(activeOrganizationId))) {
        return;
      }
    } catch {
      /* ignore */
    }
    if (!brand.primary_color) {
      router.replace("/onboarding");
    }
  }, [activeOrganizationId, sessionLoading, isFetched, brand, pathname, router]);

  return null;
}

export function markOnboardingSeen(orgId: string) {
  try {
    sessionStorage.setItem(SEEN_KEY(orgId), "1");
  } catch {
    /* ignore */
  }
}
