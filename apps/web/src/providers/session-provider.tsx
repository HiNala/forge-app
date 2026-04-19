"use client";

import * as React from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMe,
  postSwitchOrg,
  type MeResponse,
  type MembershipOut,
} from "@/lib/api";
import { QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH } from "@/lib/query-keys";
import { useUIStore } from "@/stores/ui";

const ACTIVE_ORG_STORAGE = "forge-active-org-id";

type SessionContextValue = {
  me: MeResponse | undefined;
  user: MeResponse["user"] | null;
  memberships: MembershipOut[];
  activeOrganizationId: string | null;
  activeOrg: MembershipOut | null;
  activeRole: string | null;
  isLoading: boolean;
  setActiveOrganizationId: (
    orgId: string,
    opts?: { navigateTo?: string | null },
  ) => Promise<void>;
  refetchSession: () => Promise<unknown>;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeOrgId, setActiveOrgState] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(ACTIVE_ORG_STORAGE);
    } catch {
      return null;
    }
  });

  const query = useQuery({
    queryKey: ["me", isSignedIn, activeOrgId],
    enabled: isLoaded && !!isSignedIn,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getMe(getToken, activeOrgId),
  });

  const me = query.data;

  React.useEffect(() => {
    if (!me?.memberships?.length) return;
    const valid = new Set(me.memberships.map((m) => m.organization_id));
    let next = activeOrgId;
    if (!next || !valid.has(next)) {
      next =
        me.active_organization_id && valid.has(me.active_organization_id)
          ? me.active_organization_id
          : me.memberships[0]!.organization_id;
      // Reconcile client org id with `/auth/me` membership list (source of truth).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync after async query
      setActiveOrgState(next);
      try {
        localStorage.setItem(ACTIVE_ORG_STORAGE, next);
      } catch {
        /* ignore */
      }
    }
  }, [me, activeOrgId]);

  React.useEffect(() => {
    const p = me?.preferences;
    if (!p || typeof p.sidebar_collapsed !== "boolean") return;
    useUIStore.getState().hydrateSidebarCollapsed(p.sidebar_collapsed);
  }, [me?.preferences]);

  const setActiveOrganizationId = React.useCallback(
    async (orgId: string, opts?: { navigateTo?: string | null }) => {
      await postSwitchOrg(getToken, activeOrgId, orgId);
      setActiveOrgState(orgId);
      try {
        localStorage.setItem(ACTIVE_ORG_STORAGE, orgId);
      } catch {
        /* ignore */
      }
      for (const key of QUERY_KEYS_INVALIDATED_ON_ORG_SWITCH) {
        await queryClient.invalidateQueries({ queryKey: [...key] });
      }
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      const navigateTo =
        opts?.navigateTo === null ? null : (opts?.navigateTo ?? "/dashboard");
      if (navigateTo) router.push(navigateTo);
    },
    [getToken, activeOrgId, queryClient, router],
  );

  const activeOrg =
    me?.memberships.find((m) => m.organization_id === activeOrgId) ?? null;

  const value = React.useMemo<SessionContextValue>(
    () => ({
      me,
      user: me?.user ?? null,
      memberships: me?.memberships ?? [],
      activeOrganizationId: activeOrgId,
      activeOrg,
      activeRole: me?.active_role ?? null,
      isLoading: !isLoaded || (!!isSignedIn && query.isLoading && !me),
      setActiveOrganizationId,
      refetchSession: () => query.refetch(),
    }),
    [me, activeOrgId, activeOrg, isLoaded, isSignedIn, query, setActiveOrganizationId],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useForgeSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error("useForgeSession must be used within SessionProvider");
  }
  return ctx;
}

/** FE-03 alias — same as `useForgeSession`. */
export const useSession = useForgeSession;
