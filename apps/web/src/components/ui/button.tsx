"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SPRINGS } from "@/lib/motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border text-sm font-semibold font-body",
    "transition-[transform,box-shadow,background-color,background-position,border-color,opacity,color]",
    "duration-200 ease-[var(--ease-legacy-out)] active:scale-[0.98]",
    "outline-none focus-visible:ring-2 focus-visible:ring-accent-mid focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:pointer-events-none disabled:opacity-45",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[image:var(--brand-gradient)] bg-size-[180%_180%] bg-position-[0%_50%] text-white shadow-md hover:-translate-y-px hover:bg-position-[100%_50%] hover:shadow-xl",
        secondary:
          "border-brand-violet/40 bg-transparent text-brand-violet shadow-none hover:-translate-y-px hover:bg-accent-tint hover:shadow-sm",
        ghost:
          "border-transparent bg-transparent text-text shadow-none hover:bg-bg-tinted/70",
        danger:
          "border-transparent bg-transparent text-danger shadow-none hover:bg-danger/10",
        link:
          "border-transparent bg-transparent text-brand-violet underline-offset-4 shadow-none hover:underline rounded-none h-auto min-h-0 p-0 active:scale-100",
      },
      size: {
        sm: "h-9 px-3.5 text-xs rounded-[12px]",
        md: "h-11 px-5 rounded-[14px]",
        lg: "h-13 px-8 text-base rounded-[16px]",
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

/**
 * Props that overlap Framer Motion's gesture / animation API on `motion.button`
 * (HTML drag + CSS animation events use different signatures).
 */
type ButtonHTMLProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
>;

export type ButtonProps = ButtonHTMLProps &
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
    const reduced = useReducedMotion();
    const compClass = cn(buttonVariants({ variant, size, className }));
    const tap =
      reduced || disabled || loading || variant === "link"
        ? undefined
        : { scale: 0.97 };

    if (asChild && !loading) {
      return (
        <Slot className={compClass} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        className={compClass}
        ref={ref}
        type={type}
        disabled={disabled || loading}
        whileTap={tap}
        transition={SPRINGS.snappy}
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
      </motion.button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
