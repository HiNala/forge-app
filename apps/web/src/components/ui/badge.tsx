"use client";

import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold font-body whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        live: "border-success/35 bg-success/10 text-success",
        draft: "border-warning/35 bg-warning/10 text-warning",
        archived: "border-border bg-bg-elevated text-text-muted",
        count:
          "min-w-[1.25rem] border-border bg-surface px-1.5 text-text shadow-sm",
        booking:
          "border-accent/35 bg-accent-light text-accent",
        waitlist:
          "border-brand-violet/35 bg-accent-tint text-brand-violet",
        contact:
          "border-marketing-sky/60 bg-marketing-sky/25 text-text",
        landing:
          "border-brand-coral/40 bg-brand-coral/10 text-brand-coral",
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
