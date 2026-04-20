import * as React from "react";
import { AdminShell } from "./admin-shell";

/**
 * Clerk + platform session in shell — avoid static prerender / workStore invariant on admin routes.
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
