import Link from "next/link";

/** Visible only on keyboard focus — WCAG 2.4.1 bypass blocks. */
export function SkipToContentLink({ mainId = "main-content" }: { mainId?: string }) {
  return (
    <Link
      href={`#${mainId}`}
      className="pointer-events-none fixed left-4 top-4 z-[9999] -translate-y-[200%] rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text opacity-0 shadow-lg transition-transform duration-200 focus:pointer-events-auto focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent-mid"
    >
      Skip to content
    </Link>
  );
}
