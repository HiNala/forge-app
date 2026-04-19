"use client";

import * as React from "react";

import type { PageDetailOut } from "@/lib/api";

type Ctx = {
  page: PageDetailOut;
  refetch: () => Promise<unknown>;
};

const PageDetailContext = React.createContext<Ctx | null>(null);

export function PageDetailProvider({
  page,
  refetch,
  children,
}: {
  page: PageDetailOut;
  refetch: () => Promise<unknown>;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ page, refetch }), [page, refetch]);
  return <PageDetailContext.Provider value={value}>{children}</PageDetailContext.Provider>;
}

export function usePageDetail(): Ctx {
  const c = React.useContext(PageDetailContext);
  if (!c) throw new Error("usePageDetail must be used within PageDetailProvider");
  return c;
}
