"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[var(--radius-xl)] border text-text transition-[transform,box-shadow,border-color,background-color] duration-[var(--duration-base)] ease-[var(--ease-legacy-out)] motion-reduce:transition-none",
  {
    variants: {
      variant: {
        surface: "border-border bg-surface shadow-sm",
        elevated: "border-border bg-surface shadow-lg",
        outlined: "border-border bg-transparent shadow-none",
      },
      hoverable: {
        true:
          "interaction-lift cursor-pointer motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-sm",
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
      className={cn("flex flex-col gap-2 p-6", className)}
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
      className={cn("text-h4 text-text", className)}
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
      className={cn("text-body-sm text-text-muted", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />
  );
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 p-6 pt-0", className)}
      {...props}
    />
  );
}

export { Card, cardVariants, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
