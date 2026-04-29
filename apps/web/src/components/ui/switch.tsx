"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-border bg-bg-elevated p-0.5",
        "transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-(image:--brand-gradient)",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-6 translate-x-0 rounded-full bg-white shadow-sm ring-1 ring-border/60",
          "transition-transform duration-220 ease-[cubic-bezier(0.25,0.85,0.45,1.2)] motion-reduce:duration-0",
          "data-[state=checked]:translate-x-5 data-[state=checked]:bg-white",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
