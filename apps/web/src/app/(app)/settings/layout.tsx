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
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/notifications", label: "Notifications" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-4xl">
      <nav
        className="-mx-4 mb-8 flex gap-0 overflow-x-auto border-b border-border px-4 scrollbar-thin sm:mx-0 sm:px-0"
        aria-label="Settings sections"
      >
        <ul className="flex min-w-max gap-1">
          {TABS.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cn(
                    "relative inline-flex items-center rounded-t-md px-3 py-2.5 text-sm font-medium font-body whitespace-nowrap transition-colors",
                    active ? "text-text" : "text-text-muted hover:text-text",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="settings-tab-indicator"
                      className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <span className="relative z-10">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <motion.div
        key={pathname}
        initial={{ opacity: 0.88 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
