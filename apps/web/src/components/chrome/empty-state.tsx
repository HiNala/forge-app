"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { listItem, listStagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon?: LucideIcon;
  illustrationSrc?: string;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
};

export function EmptyState({
  icon: Icon = Inbox,
  illustrationSrc = "/brand/illustrations/empty-state-glide.svg",
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center rounded-[32px] border border-dashed border-border bg-surface px-8 py-16 text-center shadow-sm",
        className,
      )}
      variants={listStagger}
      initial="hidden"
      animate="show"
    >
      {illustrationSrc ? (
        <motion.div variants={listItem} className="mb-6 w-full max-w-[300px]">
          <Image
            src={illustrationSrc}
            alt=""
            aria-hidden
            width={640}
            height={420}
            className="h-auto w-full drop-shadow-sm"
          />
        </motion.div>
      ) : (
        <motion.div
          variants={listItem}
          className="mb-5 flex size-20 items-center justify-center rounded-[24px] bg-(image:--brand-gradient) text-white shadow-md"
        >
          <Icon className="size-7 stroke-[1.5]" aria-hidden />
        </motion.div>
      )}
      <motion.h2
        variants={listItem}
        className="text-h2 text-text"
      >
        {title}
      </motion.h2>
      <motion.p
        variants={listItem}
        className="mt-2 max-w-md text-body-sm text-text-muted"
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
