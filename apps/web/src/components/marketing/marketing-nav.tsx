"use client";

import Link from "next/link";
import * as React from "react";
import { Menu, X } from "lucide-react";
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
  { href: "/#how", label: "How it works" },
  { href: "/workflows", label: "Workflows" },
  { href: "/compare", label: "Compare" },
  { href: "/pricing", label: "Pricing" },
  { href: "/examples", label: "Examples" },
] as const;

export function MarketingNav() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,box-shadow] duration-200",
        scrolled
          ? "border-border bg-bg/95 shadow-sm backdrop-blur-md"
          : "border-transparent bg-bg/80 backdrop-blur-sm",
      )}
    >
      <Container max="xl" className="flex h-14 items-center justify-between sm:h-16">
        {/* Logo */}
        <Link
          href="/"
          className="flex min-h-11 min-w-0 items-center gap-2 font-display text-xl font-bold tracking-tight text-text no-underline"
        >
          <ForgeLogo size="md" className="text-accent" />
          <span>Forge</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="min-h-11 inline-flex items-center font-body text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/signin"
            className="min-h-11 inline-flex items-center font-body text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Sign in
          </Link>
          <Button asChild size="sm" className="min-h-11">
            <Link href="/signup?source=nav">Start free</Link>
          </Button>
        </nav>

        {/* Mobile menu */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Open menu"
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw,300px)]">
              <SheetHeader>
                <SheetTitle className="text-left font-display text-lg">Forge</SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-1">
                {links.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "min-h-11 rounded-lg px-3 py-2.5 font-body text-base font-medium text-text",
                      "transition-colors hover:bg-bg-elevated",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
                <div className="my-2 border-t border-border" />
                <Link
                  href="/signin"
                  className="min-h-11 rounded-lg px-3 py-2.5 font-body text-base font-medium text-text transition-colors hover:bg-bg-elevated"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
                <Button asChild className="mt-3 w-full min-h-11">
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
