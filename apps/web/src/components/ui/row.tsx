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

export type RowGap = keyof typeof gapMap;

export type RowProps = React.HTMLAttributes<HTMLDivElement> & {
  gap?: RowGap;
  /** Horizontal alignment */
  justify?: "start" | "center" | "end" | "between";
  /** Vertical alignment */
  align?: "start" | "center" | "end" | "stretch";
};

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

/** Horizontal flex row — gaps map to the 4px spacing scale. */
export function Row({
  gap = 4,
  justify = "start",
  align = "center",
  className,
  ...props
}: RowProps) {
  return (
    <div
      className={cn(
        "flex flex-row",
        gapMap[gap],
        justifyMap[justify],
        alignMap[align],
        className,
      )}
      {...props}
    />
  );
}
