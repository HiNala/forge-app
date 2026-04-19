"use client";

import { CreditCard, Palette, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LINKS = [
  {
    href: "/settings/team",
    title: "Team",
    description: "Members, roles, and invitations.",
    icon: Users,
  },
  {
    href: "/settings/brand",
    title: "Brand kit",
    description: "Colors, typography, logo, and voice notes for this workspace.",
    icon: Palette,
  },
  {
    href: "/settings/billing",
    title: "Billing",
    description: "Plan, usage, and invoices (checkout when enabled).",
    icon: CreditCard,
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">Settings</h1>
        <p className="mt-2 text-text-muted font-body">
          Manage your workspace profile and how Forge looks while you work.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map(({ href, title, description, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="block h-full rounded-[10px] focus-visible:outline-none">
              <Card className="h-full border-border transition-colors hover:bg-bg-elevated/60">
                <CardHeader className="flex flex-row items-start gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold">{title}</CardTitle>
                    <CardDescription className="mt-1">{description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
