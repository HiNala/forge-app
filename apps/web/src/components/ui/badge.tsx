"use client";

import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium font-body whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        live: "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        draft: "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        archived: "border-border bg-bg-elevated text-text-muted",
        count:
          "min-w-[1.25rem] border-border bg-surface px-1.5 text-text shadow-sm",
        booking:
          "border-accent/35 bg-accent-light text-text",
        waitlist:
          "border-violet-500/35 bg-violet-500/10 text-violet-900 dark:text-violet-100",
        contact:
          "border-sky-500/35 bg-sky-500/10 text-sky-900 dark:text-sky-100",
        landing:
          "border-rose-500/35 bg-rose-500/10 text-rose-900 dark:text-rose-100",
      },
    },
    defaultVariants: {
      variant: "draft",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
