import Link from "next/link";
import { ForgeLogo } from "@/components/icons/logo";
import { Container } from "@/components/ui/container";

type FooterLink = { href: string; label: string; external?: boolean };

const FOOTER_LINKS: FooterLink[] = [
  { href: "/pricing", label: "Pricing" },
  { href: "/examples", label: "Examples" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "mailto:hello@forge.app", label: "Contact", external: true },
  { href: "https://status.forge.app", label: "Status", external: true },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <Container max="xl" className="py-16 sm:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1fr_1fr] lg:gap-16">
          {/* Small print + brand */}
          <div className="max-w-[40ch]">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight text-text no-underline"
            >
              <ForgeLogo size="md" className="text-accent" />
              Forge
            </Link>
            <p className="mt-4 max-w-[65ch] font-body text-sm font-light leading-relaxed text-text-muted">
              Describe what you need. Get a hosted page — forms, RSVPs, menus, proposals — without a dev team.
            </p>
            <p className="mt-8 font-body text-xs text-text-subtle">
              © {new Date().getFullYear()} Digital Studio Labs. All rights reserved.
            </p>
          </div>

          {/* Links column */}
          <div>
            <p className="section-label mb-4">Links</p>
            <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
              {FOOTER_LINKS.map(({ href, label, external }) => (
                <li key={href}>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center font-body text-sm text-text-muted transition-colors hover:text-text"
                    >
                      {label}
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center font-body text-sm text-text-muted transition-colors hover:text-text"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
          <p className="font-body text-xs text-text-subtle">
            Made by{" "}
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
            href="/signup?source=footer"
            className="font-body text-xs font-semibold text-accent underline-offset-4 hover:underline"
          >
            Start free →
          </Link>
        </div>
      </Container>
    </footer>
  );
}
