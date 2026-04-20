"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { listItem, listStagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-8 py-16 text-center shadow-sm",
        className,
      )}
      variants={listStagger}
      initial="hidden"
      animate="show"
    >
      <motion.div
        variants={listItem}
        className="mb-5 flex size-14 items-center justify-center rounded-full bg-accent-light text-accent ring-1 ring-border/50"
      >
        <Icon className="size-7 stroke-[1.5]" aria-hidden />
      </motion.div>
      <motion.h2
        variants={listItem}
        className="font-display text-2xl font-bold text-text"
      >
        {title}
      </motion.h2>
      <motion.p
        variants={listItem}
        className="mt-2 max-w-md text-sm leading-relaxed text-text-muted font-body"
      >
        {description}
      </motion.p>
      <motion.div
        variants={listItem}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        {primaryAction && (
          <Button type="button" variant="primary" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            type="button"
            variant="secondary"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
