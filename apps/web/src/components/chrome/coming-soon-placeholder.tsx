"use client";

import { PageHeader } from "@/components/chrome/page-header";
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
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title="Coming soon"
        description="This area will ship in a dedicated mission — navigation is wired so you never hit a dead link."
      />
    </>
  );
}
