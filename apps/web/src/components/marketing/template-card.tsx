import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  name: string;
  tag: string;
  description: string;
};

/**
 * Gallery card: thumbnail region crossfades two gradient “states” on hover (no stock photos).
 */
export function TemplateCard({ href, name, tag, description }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "group block overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-[box-shadow,transform]",
        "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-bg-elevated">
        <div
          className="absolute inset-0 bg-gradient-to-br from-accent-light via-bg to-bg-elevated transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)] group-hover:opacity-0"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-bg-elevated via-accent-light/50 to-accent/15 opacity-0 transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)] group-hover:opacity-100"
          aria-hidden
        />
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{tag}</p>
        <p className="mt-1 font-display text-lg font-semibold text-text">{name}</p>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-text-muted">{description}</p>
      </div>
    </Link>
  );
}
