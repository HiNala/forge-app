"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/brand", label: "Brand" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/calendars", label: "Calendars" },
  { href: "/settings/notifications", label: "Notifications" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-3xl">
      {/* Settings section label */}
      <p className="section-label mb-3">Settings</p>

      {/* Tab navigation */}
      <nav
        className="-mx-1 mb-10 overflow-x-auto"
        aria-label="Settings sections"
      >
        <ul className="flex min-w-max gap-0.5 border-b border-border pb-px">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cn(
                    "relative inline-flex min-h-10 items-center px-3.5 py-2 font-body text-sm font-medium whitespace-nowrap transition-colors duration-100",
                    active
                      ? "text-text"
                      : "text-text-muted hover:text-text focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="settings-tab-indicator"
                      className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-text"
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

      <p className="mb-8 text-xs text-text-muted">
        Press <kbd className="rounded border border-border px-1 font-mono">?</kbd> for the shortcut list, or{" "}
        <Link href="/help/shortcuts" className="font-medium text-accent hover:underline">
          open the full cheatsheet
        </Link>
        .
      </p>

      {/* Page content with fade transition */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
