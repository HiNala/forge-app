import * as React from "react";
import { AppShell } from "@/components/chrome/app-shell";

/** Clerk + client shell need request context; static prerender hits Next 16 workStore invariant. */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
