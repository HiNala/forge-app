"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FaqItem = { q: string; a: string };

export function FaqAccordion({
  items,
  className,
}: {
  items: FaqItem[];
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border rounded-2xl border border-border bg-surface", className)}>
      {items.map((item) => (
        <details key={item.q} className="group p-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-left font-medium text-text font-body outline-none marker:content-none [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
            <span className="max-w-[65ch] pr-2">{item.q}</span>
            <ChevronDown
              aria-hidden
              className="size-5 shrink-0 text-text-subtle transition-transform duration-[var(--duration-fast)] group-open:rotate-180"
            />
          </summary>
          <div className="max-w-[65ch] px-5 pb-4 text-sm leading-relaxed text-text-muted font-body">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
