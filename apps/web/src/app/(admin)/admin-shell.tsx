"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { getPlatformSession, postPlatformVisit, type PlatformSession } from "@/lib/api";

const NAV: { href: string; label: string; perm: string }[] = [
  { href: "/admin/overview/pulse", label: "Pulse", perm: "analytics:read_platform_metrics" },
  { href: "/admin/overview", label: "Overview", perm: "analytics:read_platform_metrics" },
  { href: "/admin/orgs", label: "Organizations", perm: "orgs:read_list" },
  { href: "/admin/llm", label: "LLM & AI Spend", perm: "llm:read_usage" },
];

function hasPerm(session: PlatformSession | null, key: string): boolean {
  if (!session) return false;
  return session.permissions.includes(key);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { getToken } = useAuth();
  const [session, setSession] = React.useState<PlatformSession | null>(null);
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const isNarrow = useMediaNarrow();

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getPlatformSession(getToken);
        if (!cancelled) {
          setSession(s);
          if (s.permissions.length === 0) {
            setBlocked("You don’t have platform access.");
          } else {
            void postPlatformVisit(getToken).catch(() => {});
          }
        }
      } catch {
        if (!cancelled) setBlocked("Could not load admin session.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (blocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#edebe6] px-6 font-body text-text">
        <p className="max-w-md text-center">{blocked}</p>
        <Link href="/dashboard" className="mt-4 text-sm text-accent underline">
          Back to app
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#edebe6] text-text"
      data-admin-root
      data-admin-readonly={isNarrow ? "true" : undefined}
    >
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#edebe6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-black/15 bg-white/60 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Admin
            </span>
            <span className="font-display text-lg font-semibold">Forge</span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Back to main app
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="space-y-1 text-sm">
            {NAV.filter((n) => hasPerm(session, n.perm)).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "block rounded-lg px-3 py-2 font-medium transition-colors",
                  pathname === n.href || pathname.startsWith(n.href + "/")
                    ? "bg-black/[0.06] text-text"
                    : "text-text-muted hover:bg-black/[0.04] hover:text-text",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function useMediaNarrow(): boolean {
  const [n, setN] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = () => setN(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return n;
}
