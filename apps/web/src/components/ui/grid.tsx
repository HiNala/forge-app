import * as React from "react";
import { cn } from "@/lib/utils";

const gapMap = {
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
} as const;

const colsMap = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  auto: "grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]",
} as const;

export type GridProps = React.HTMLAttributes<HTMLDivElement> & {
  cols?: keyof typeof colsMap;
  gap?: keyof typeof gapMap;
};

export function Grid({
  cols = 2,
  gap = 4,
  className,
  ...props
}: GridProps) {
  return (
    <div
      className={cn("grid", colsMap[cols], gapMap[gap], className)}
      {...props}
    />
  );
}
