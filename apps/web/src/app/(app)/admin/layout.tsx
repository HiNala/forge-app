import type { ReactNode } from "react";

/**
 * Admin routes use Clerk client hooks; force dynamic rendering so prerender does not
 * hit the Next 16 + Turbopack "workStore" invariant during `next build`.
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
