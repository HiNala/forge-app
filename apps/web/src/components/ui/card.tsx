"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[var(--radius-lg)] border text-text transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-legacy-out)]",
  {
    variants: {
      variant: {
        surface: "border-border bg-surface shadow-sm",
        elevated: "border-border bg-surface shadow-md",
        outlined: "border-border bg-transparent shadow-none",
      },
      hoverable: {
        true: "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
        false: "",
      },
    },
    defaultVariants: {
      variant: "surface",
      hoverable: false,
    },
  },
);

export type CardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants> & {
    /** @deprecated Use `hoverable` */
    interactive?: boolean;
  };

function Card({ className, variant, hoverable, interactive, ...props }: CardProps) {
  const isHover = hoverable ?? interactive;
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, hoverable: !!isHover }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-5", className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-display text-xl font-semibold leading-tight text-text", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-text-muted font-body", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-content" className={cn("p-5 pt-0", className)} {...props} />
  );
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 p-5 pt-0", className)}
      {...props}
    />
  );
}

export { Card, cardVariants, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
