import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES = { sm: 18, md: 28, lg: 52 } as const;

export type ForgeLogoProps = {
  /** Sidebar (18px), header (28px), marketing hero (52px). */
  size?: keyof typeof SIZES;
  className?: string;
};

/**
 * Forge page mark — two overlapping rectangles + three horizontal lines (v6 reference).
 * Uses `currentColor` for the glyph; default palette applies `text-accent` via className.
 */
export function ForgeLogo({ size = "md", className }: ForgeLogoProps) {
  const px = SIZES[size];
  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      className={cn("shrink-0 text-accent", className)}
      aria-hidden
    >
      <rect x="2" y="4" width="12" height="22" rx="2" fill="currentColor" opacity="0.92" />
      <rect x="17" y="8" width="13" height="18" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="19" y="12" width="9" height="1.5" rx="0.5" fill="var(--bg)" />
      <rect x="19" y="16" width="9" height="1.5" rx="0.5" fill="var(--bg)" />
      <rect x="19" y="20" width="6" height="1.5" rx="0.5" fill="var(--bg)" />
    </svg>
  );
}

/** @deprecated Use `<ForgeLogo />` — alias for sidebar default (md). */
export function ForgeMark({ className }: { className?: string }) {
  return <ForgeLogo size="md" className={className} />;
}
