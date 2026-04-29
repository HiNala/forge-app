"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/forge-auth-provider";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import * as React from "react";
import { getPlatformSession } from "@/lib/api";
import { cn } from "@/lib/utils";

const ADMIN_TABS = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/overview/pulse", label: "Pulse" },
  { href: "/admin/patterns", label: "Patterns" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/orgs", label: "Organizations" },
  { href: "/admin/llm", label: "LLM" },
  { href: "/admin/orchestration-quality", label: "Quality" },
  { href: "/admin/templates", label: "Templates" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const pathname = usePathname();

  const sessionQ = useQuery({
    queryKey: ["platform-session"],
    queryFn: () => getPlatformSession(getToken),
    retry: false,
  });

  if (sessionQ.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 font-body text-sm text-text-muted">
        <span className="size-4 animate-spin rounded-full border-2 border-border border-t-accent" />
        Checking admin access…
      </div>
    );
  }

  if (sessionQ.isError || !sessionQ.data) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <ShieldAlert className="size-10 text-danger opacity-60" />
        <div>
          <p className="font-display text-lg font-bold text-text">Access denied</p>
          <p className="mt-1 font-body text-sm text-text-muted">
            This area is restricted to platform administrators.
          </p>
        </div>
        <Link href="/dashboard" className="font-body text-sm text-accent hover:underline">
          Back to dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Admin header */}
      <div className="mb-6 rounded-[32px] bg-marketing-ink p-6 text-white shadow-lg">
        <span className="rounded-full bg-white/10 px-3 py-1 font-body text-xs font-bold uppercase tracking-wide text-white">
          Admin
        </span>
        <p className="mt-3 font-body text-sm text-white/70">
          GlideDesign platform control panel — restricted to{" "}
          {sessionQ.data.platform_roles.join(", ") || "admins"}
        </p>
      </div>

      {/* Tab navigation */}
      <nav className="mb-8 overflow-x-auto rounded-[24px] border border-border bg-surface p-2 shadow-sm" aria-label="Admin sections">
        <ul className="flex min-w-max gap-1">
          {ADMIN_TABS.map((tab) => {
            const active =
              tab.href === "/admin/overview"
                ? pathname === tab.href
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cn(
                    "relative inline-flex min-h-10 items-center rounded-full px-3.5 py-2 font-body text-sm font-semibold whitespace-nowrap transition-colors duration-100",
                    active
                      ? "bg-[image:var(--brand-gradient)] text-white"
                      : "text-text-muted hover:bg-accent-tint hover:text-accent",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-tab-indicator"
                      className="absolute inset-0 rounded-full bg-[image:var(--brand-gradient)]"
                      transition={{ type: "spring", stiffness: 420, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
