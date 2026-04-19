"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { SPRINGS } from "@/lib/motion";
import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-11 items-center justify-start gap-1 rounded-md bg-bg-elevated/80 p-1 text-text-muted",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-9 flex-1 items-center justify-center whitespace-nowrap rounded-[6px] px-3 text-sm font-medium font-body",
        "transition-[color] duration-[200ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "data-[state=active]:text-text data-[state=inactive]:hover:text-text",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "mt-2 flex-1 outline-none focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

type TabsListSlidingProps = React.ComponentProps<typeof TabsPrimitive.List> & {
  /** Same as parent `<Tabs value>` so the indicator tracks controlled changes. */
  syncValue?: string;
};

/**
 * Sliding indicator tabs — pass `syncValue` equal to `Tabs` `value`.
 */
function TabsListSliding({
  className,
  children,
  syncValue,
  ...rest
}: TabsListSlidingProps) {
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 });
  const listRef = React.useRef<HTMLDivElement>(null);

  const recompute = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[data-state="active"]');
    if (!active) return;
    const lr = list.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    setIndicator({
      left: ar.left - lr.left,
      width: ar.width,
    });
  }, []);

  React.useLayoutEffect(() => {
    recompute();
  }, [recompute, syncValue, children]);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(list);
    const mo = new MutationObserver(() => recompute());
    mo.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list-sliding"
      className={cn(
        "relative inline-flex h-11 min-w-0 items-center justify-start gap-0 rounded-md bg-bg-elevated/80 p-1",
        className,
      )}
      {...rest}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute bottom-1 top-1 rounded-[6px] bg-surface shadow-sm ring-1 ring-border/60"
        animate={{ left: indicator.left, width: indicator.width }}
        transition={SPRINGS.soft}
      />
      {children}
    </TabsPrimitive.List>
  );
}

export { Tabs, TabsContent, TabsList, TabsListSliding, TabsTrigger };
