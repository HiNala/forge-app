import * as React from "react";
import { AppShell } from "@/components/chrome/app-shell";

/** Clerk + session-heavy shell must not be statically prerendered (build/runtime invariants). */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
