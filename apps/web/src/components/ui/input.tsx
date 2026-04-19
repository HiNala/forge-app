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
            "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text",
            "font-body shadow-sm transition-[box-shadow,border-color,opacity] duration-200 ease-[var(--ease-legacy-out)]",
            "placeholder:text-text-subtle",
            "focus-visible:border-accent focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-light)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-danger focus-visible:border-danger focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--danger)_25%,transparent)]",
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
