import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES = { sm: 18, md: 28, lg: 52 } as const;

export type GlideDesignLogoProps = {
  /** Sidebar (18px), header (28px), marketing hero (52px). */
  size?: keyof typeof SIZES;
  className?: string;
  showWordmark?: boolean;
};

/** @deprecated Use `GlideDesignLogoProps`; retained for compatibility during the rebrand. */
export type ForgeLogoProps = GlideDesignLogoProps;

export function GlideDesignMark({ size = "md", className }: GlideDesignLogoProps) {
  const px = SIZES[size];
  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="glide-mark-gradient" x1="6" y1="4" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-violet)" />
          <stop offset="1" stopColor="var(--brand-coral)" />
        </linearGradient>
      </defs>
      <path
        d="M9.7 4.9C8.9 4.3 8 4.9 8 5.9v20.4c0 1.1 1.3 1.6 2.1.9l5.2-4.7 3.5 8c.3.6 1 .9 1.6.6l4.7-2c.6-.3.9-1 .6-1.6l-3.4-7.8h7.4c1.1 0 1.6-1.3.8-2L9.7 4.9Z"
        fill="url(#glide-mark-gradient)"
      />
      <circle cx="7" cy="27" r="2.1" fill="url(#glide-mark-gradient)" opacity="0.82" />
    </svg>
  );
}

export function GlideDesignLogo({
  size = "md",
  className,
  showWordmark = false,
}: GlideDesignLogoProps) {
  if (!showWordmark) return <GlideDesignMark size={size} className={className} />;

  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-extrabold tracking-[-0.04em]", className)}>
      <GlideDesignMark size={size} />
      <span>GlideDesign</span>
    </span>
  );
}

/** @deprecated Use `<GlideDesignLogo />`; kept during the aesthetic rebrand sweep. */
export function ForgeLogo(props: GlideDesignLogoProps) {
  return <GlideDesignLogo {...props} />;
}

/** @deprecated Use `<GlideDesignMark />`; kept during the aesthetic rebrand sweep. */
export function ForgeMark({ className }: { className?: string }) {
  return <GlideDesignMark size="md" className={className} />;
}
