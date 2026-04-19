"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-bg-elevated",
        "bg-[linear-gradient(90deg,var(--bg-elevated)_0%,color-mix(in_oklch,var(--surface)_70%,white)_50%,var(--bg-elevated)_100%)]",
        "bg-[length:200%_100%] bg-[position:-200%_0]",
        "animate-[shimmer_1.3s_ease-in-out_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
