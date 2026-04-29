"use client";

import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { cn } from "@/lib/utils";

export type TextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "style"
> & {
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
};

const textAreaClass = cn(
  "flex w-full rounded-[14px] border border-border bg-bg-overlay px-4 py-3 text-base text-text",
  "font-body font-medium shadow-sm transition-[box-shadow,border-color,background-color,opacity] duration-200 ease-[var(--ease-legacy-out)]",
  "placeholder:text-text-muted hover:border-border-strong hover:bg-bg-raised/70",
  "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  "disabled:cursor-not-allowed disabled:bg-bg-elevated/50 disabled:opacity-60",
);

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      helperText,
      showCount,
      maxLength,
      autoResize,
      minRows = 3,
      maxRows = 24,
      onChange,
      value,
      defaultValue,
      id: idProp,
      ...props
    },
    ref,
  ) => {
    const [len, setLen] = React.useState(0);

    const genId = React.useId();
    const id = idProp ?? genId;
    const describedBy =
      error || helperText
        ? `${id}-${error ? "err" : "hint"}`
        : undefined;

    const shared = {
      id,
      maxLength,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
      value,
      defaultValue,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLen(e.target.value.length);
        onChange?.(e);
      },
      className: cn(
        textAreaClass,
        error &&
          "border-danger focus-visible:border-danger focus-visible:ring-danger",
        autoResize ? "min-h-0 resize-none overflow-hidden" : "min-h-[100px] resize-y",
        className,
      ),
      ...props,
    };

    return (
      <div className="w-full space-y-1.5">
        {autoResize ? (
          <TextareaAutosize
            ref={ref}
            minRows={minRows}
            maxRows={maxRows}
            {...shared}
          />
        ) : (
          <textarea ref={ref} {...shared} />
        )}
        {(showCount || maxLength) && (
          <div className="flex justify-end text-[11px] text-text-muted font-body">
            {len}
            {maxLength != null ? ` / ${maxLength}` : ""}
          </div>
        )}
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
Textarea.displayName = "Textarea";

export { Textarea };
