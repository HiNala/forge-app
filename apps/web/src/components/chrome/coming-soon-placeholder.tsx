"use client";

import { EmptyState } from "@/components/chrome/empty-state";
import type { LucideIcon } from "lucide-react";

export function ComingSoonPlaceholder({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">{title}</h1>
        {description ? (
          <p className="mt-1.5 font-body text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      <EmptyState
        icon={icon}
        title="Coming soon"
        description="This area will ship in a dedicated mission — navigation is wired so you never hit a dead link."
      />
    </div>
  );
}
