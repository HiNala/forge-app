"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helperText?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, helperText, id, ...props }, ref) => {
    const genId = React.useId();
    const inputId = id ?? genId;
    const describedBy =
      error || helperText
        ? `${inputId}-${error ? "err" : "hint"}`
        : undefined;

    return (
      <div className="w-full space-y-1.5">
        <input
          id={inputId}
          type={type}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "flex h-11 w-full rounded-[14px] border border-border bg-bg-overlay px-4 py-2 text-base text-text",
            "font-body font-medium shadow-sm transition-[box-shadow,border-color,background-color,opacity] duration-200 ease-(--ease-legacy-out)",
            "placeholder:text-text-muted hover:border-border-strong hover:bg-bg-raised/70",
            "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            "disabled:cursor-not-allowed disabled:bg-bg-elevated/50 disabled:opacity-60",
            error &&
              "border-danger focus-visible:border-danger focus-visible:ring-danger",
            className,
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            id={describedBy}
            className={cn(
              "text-xs font-body",
              error ? "text-danger" : "text-text-muted",
            )}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
