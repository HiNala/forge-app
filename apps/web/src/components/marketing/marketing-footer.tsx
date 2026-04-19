import Link from "next/link";
import { Container } from "@/components/ui/container";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-bg-elevated">
      <Container max="xl" className="py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="font-display text-lg font-semibold text-text">Forge</p>
            <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-text-muted">
              Describe what you need. Get a branded page you can publish in minutes.
            </p>
            <p className="mt-6 text-xs text-text-subtle">
              © {new Date().getFullYear()} Digital Studio Labs. All rights reserved.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/pricing"
                  className="min-h-11 inline-flex items-center text-sm text-text-muted transition-colors hover:text-text"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/examples"
                  className="min-h-11 inline-flex items-center text-sm text-text-muted transition-colors hover:text-text"
                >
                  Examples
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">
              Legal & status
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/terms"
                  className="min-h-11 inline-flex items-center text-sm text-text-muted transition-colors hover:text-text"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="min-h-11 inline-flex items-center text-sm text-text-muted transition-colors hover:text-text"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@forge.app"
                  className="min-h-11 inline-flex items-center text-sm text-text-muted transition-colors hover:text-text"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="https://status.forge.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-11 inline-flex items-center text-sm text-text-muted transition-colors hover:text-text"
                >
                  Status
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-8 text-center text-xs text-text-subtle sm:text-left">
          <p>
            A product of{" "}
            <a
              href="https://digitalstudiolabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted underline-offset-2 hover:underline"
            >
              Digital Studio Labs
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}
