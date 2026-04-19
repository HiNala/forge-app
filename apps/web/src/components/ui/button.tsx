"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium font-body",
    "transition-[transform,box-shadow,background-color,border-color,opacity,color]",
    "duration-[var(--duration-fast)] ease-[var(--ease-legacy-out)]",
    "outline-none focus-visible:ring-2 focus-visible:ring-accent-mid focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:pointer-events-none disabled:opacity-45",
    "active:scale-[0.97] active:duration-[var(--duration-fast)]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-accent text-white shadow-sm hover:brightness-[1.05]",
        secondary:
          "border-border bg-surface text-text shadow-sm hover:bg-bg-elevated",
        ghost:
          "border-transparent bg-transparent text-text hover:bg-bg-elevated/80",
        danger:
          "border-transparent bg-danger text-white shadow-sm hover:brightness-[1.05]",
        link:
          "border-transparent bg-transparent text-accent underline-offset-4 shadow-none hover:underline rounded-none h-auto min-h-0 p-0 active:scale-100",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[6px]",
        md: "h-10 px-4 rounded-[7px]",
        lg: "h-12 px-6 text-base rounded-[8px]",
      },
    },
    compoundVariants: [
      { variant: "link", size: ["sm", "md", "lg"], class: "px-0 py-0 text-sm" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const compClass = cn(buttonVariants({ variant, size, className }));

    if (asChild && !loading) {
      return (
        <Slot className={compClass} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={compClass}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            <span className="sr-only">Loading</span>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
