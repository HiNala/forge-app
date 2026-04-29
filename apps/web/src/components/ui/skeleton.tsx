"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-[14px] bg-bg-elevated/70",
        "bg-[linear-gradient(90deg,var(--bg-elevated)_0%,color-mix(in_oklch,var(--surface)_88%,white)_48%,var(--bg-elevated)_100%)]",
        "bg-size-[200%_100%] bg-position-[-200%_0]",
        "animate-[shimmer_1.6s_ease-in-out_infinite] motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
