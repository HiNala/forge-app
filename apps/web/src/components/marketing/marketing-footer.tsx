import Link from "next/link";
import { ForgeLogo } from "@/components/icons/logo";
import { Container } from "@/components/ui/container";

const LINKS = {
  Product: [
    { href: "/#how", label: "How it works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/examples", label: "Examples" },
    { href: "/signup", label: "Start free" },
  ],
  Legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "mailto:hello@forge.app", label: "Contact" },
    { href: "https://status.forge.app", label: "Status", external: true },
  ],
} as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <Container max="xl" className="py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-[1fr_auto_auto]">
          {/* Brand */}
          <div className="max-w-[280px]">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-text no-underline"
            >
              <ForgeLogo size="md" className="text-accent" />
              Forge
            </Link>
            <p className="mt-4 font-body text-sm font-light leading-relaxed text-text-muted">
              Type a sentence. Get a live, hosted page. No code, no designer, no wait.
            </p>
            <p className="mt-6 font-body text-xs text-text-subtle">
              © {new Date().getFullYear()} Digital Studio Labs
            </p>
          </div>

          {/* Link columns */}
          {(Object.entries(LINKS) as [string, ReadonlyArray<{ href: string; label: string; external?: boolean }>][]).map(
            ([heading, items]) => (
              <div key={heading}>
                <p className="section-label mb-4">{heading}</p>
                <ul className="space-y-3">
                  {items.map(({ href, label, external }) => (
                    <li key={href}>
                      {external ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-body text-sm text-text-muted transition-colors hover:text-text"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className="font-body text-sm text-text-muted transition-colors hover:text-text"
                        >
                          {label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
          <p className="font-body text-xs text-text-subtle">
            Built by{" "}
            <a
              href="https://digitalstudiolabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Digital Studio Labs
            </a>
          </p>
          <Link
            href="/signup"
            className="font-body text-xs font-semibold text-accent underline-offset-4 hover:underline"
          >
            Start building free →
          </Link>
        </div>
      </Container>
    </footer>
  );
}
