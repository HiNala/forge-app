import * as React from "react";

import { cn } from "@/lib/utils";

export type PageHeaderProps = {
  title: string;
  description?: string;
  /** Optional trail above the title (not a second sidebar — use for in-page wayfinding only). */
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Shared title region for authenticated screens (FE-03).
 * Prefer a single primary action; global navigation stays in the shell.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {breadcrumb ? (
          <div className="mb-2 text-sm text-text-muted font-body">{breadcrumb}</div>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[65ch] text-text-muted font-body">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
