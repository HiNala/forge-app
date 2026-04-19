"use client";

import Link from "next/link";
import * as React from "react";
import { Menu } from "lucide-react";
import { ForgeLogo } from "@/components/icons/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: "/examples", label: "Examples" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur-md">
      <Container max="xl" className="flex h-14 items-center justify-between sm:h-16">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 items-center gap-2 font-display text-xl font-semibold tracking-tight text-text no-underline"
        >
          <ForgeLogo size="md" className="text-accent" />
          <span>Forge</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-text-muted md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="min-h-11 inline-flex items-center transition-colors hover:text-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/signin"
            className="min-h-11 inline-flex items-center transition-colors hover:text-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="min-h-11">
            <Link href="/signup?source=nav">Start free</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw,320px)]">
              <SheetHeader>
                <SheetTitle className="text-left font-display">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {links.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "min-h-11 rounded-md px-3 py-2 text-base font-medium text-text",
                      "hover:bg-bg-elevated",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
                <Link
                  href="/signin"
                  className="min-h-11 rounded-md px-3 py-2 text-base font-medium text-text hover:bg-bg-elevated"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
                <Button asChild className="mt-4 w-full min-h-11">
                  <Link href="/signup?source=nav" onClick={() => setOpen(false)}>
                    Start free
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
