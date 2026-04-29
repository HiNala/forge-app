import Link from "next/link";
import { GlideDesignLogo } from "@/components/icons/logo";
import { Container } from "@/components/ui/container";

const LINKS = {
  Product: [
    { href: "/#templates", label: "Templates" },
    { href: "/workflows", label: "Workflows" },
    { href: "/pricing", label: "Pricing" },
    { href: "/compare", label: "Compare" },
    { href: "/signup", label: "Get started" },
  ],
  Resources: [
    { href: "/roadmap", label: "Roadmap" },
    { href: "/help", label: "Help" },
    { href: "/blog", label: "Blog" },
    { href: "/press", label: "Press" },
  ],
  Legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
    { href: "mailto:hello@glidedesign.ai", label: "Contact" },
    { href: "https://status.glidedesign.ai", label: "Status", external: true },
  ],
} as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <Container max="xl" className="py-16 sm:py-24">
        <div className="grid gap-12 sm:grid-cols-[1fr_auto_auto_auto]">
          {/* Brand */}
          <div className="max-w-[280px]">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xl text-text no-underline"
            >
              <GlideDesignLogo size="md" showWordmark />
            </Link>
            <p className="mt-4 text-body-sm text-text-muted">
              Glide from idea to product. Strategy, screens, code, and next moves in one bright AI design workspace.
            </p>
            <p className="mt-6 text-caption text-text-subtle">
              © {new Date().getFullYear()} GlideDesign
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
                          className="font-body text-sm font-medium text-text-muted transition-colors hover:text-text"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          href={href}
                          className="font-body text-sm font-medium text-text-muted transition-colors hover:text-text"
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
          <p className="text-caption text-text-subtle">
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
            className="text-caption font-semibold text-accent underline-offset-4 hover:underline"
          >
            Get started for free →
          </Link>
        </div>
      </Container>
    </footer>
  );
}
