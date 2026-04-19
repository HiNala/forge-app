import * as React from "react";
import { cn } from "@/lib/utils";

const gapMap = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  16: "gap-16",
} as const;

export type StackGap = keyof typeof gapMap;

export type StackProps = React.HTMLAttributes<HTMLDivElement> & {
  gap?: StackGap;
  as?: "div" | "section" | "article" | "main" | "aside";
};

/** Vertical flex stack — gaps map to the 4px spacing scale. */
export function Stack({
  gap = 4,
  as: Comp = "div",
  className,
  ...props
}: StackProps) {
  return (
    <Comp className={cn("flex flex-col", gapMap[gap], className)} {...props} />
  );
}
