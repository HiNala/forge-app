"use client";

import Link from "next/link";
import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { PRICING_COMPARISON, PRICING_FAQ } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  monthly: number | null;
  /** When non-null, show strikethrough / crossed annual helper */
  annualNote: string;
  blurb: string;
  features: string[];
  highlight: boolean;
  cta: { href: string; label: string };
  /** Show $0 style */
  isFree?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    monthly: 0,
    annualNote: "",
    blurb: "For trying Forge on real work.",
    features: [
      "Hosted mini-apps on Forge links",
      "Core exports where available",
      "Session-based usage with a weekly cap",
      "Email support — best effort",
    ],
    highlight: false,
    isFree: true,
    cta: { href: "/signup?plan=free&source=pricing", label: "Start free" },
  },
  {
    name: "Pro",
    monthly: 49,
    annualNote: "Save about two months on annual",
    blurb: "For most makers and small teams.",
    features: [
      "Higher live mini-app and submission limits",
      "Custom domain + TLS",
      "Automations and calendar sync",
      "12-month analytics retention",
      "Priority support",
    ],
    highlight: true,
    cta: { href: "/signup?plan=pro&source=pricing", label: "Start Pro" },
  },
  {
    name: "Max",
    monthly: 99,
    annualNote: "Save about two months on annual",
    blurb: "For people who live in Studio every day.",
    features: [
      "Highest published limits on self-serve",
      "Read/write API access (where enabled)",
      "24-month analytics retention",
      "Priority support with same-day target",
    ],
    highlight: false,
    cta: { href: "/signup?plan=max&source=pricing", label: "Start Max" },
  },
];

function UsageExplainer() {
  return (
    <section className="border-t border-border bg-bg-elevated/30 py-14 sm:py-16">
      <Container max="lg">
        <div className="max-w-2xl">
          <span className="section-label">Usage</span>
          <h2 className="mt-2 font-display text-[clamp(22px,3vw,32px)] font-bold text-text">
            Honest limits — session usage with a weekly cap
          </h2>
          <p className="mt-3 font-body text-sm font-light leading-relaxed text-text-muted">
            You will see a single percentage bar: how much of this week&rsquo;s included Studio work you have used.
            Hitting 100% pauses new generation until the window resets or you move up a tier. Exact caps ship with
            billing (mission V2-P04) — the UX pattern stays this simple.
          </p>
        </div>
        <div
          className="mt-8 max-w-md rounded-2xl border border-border bg-surface p-5 shadow-sm"
          role="img"
          aria-label="Sample usage at about two thirds of the weekly cap"
        >
          <p className="font-body text-xs font-medium text-text-subtle">This week — Studio</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: "67%" }}
            />
          </div>
          <p className="mt-2 font-body text-xs text-text-muted">67% of included usage used — 33% left this week</p>
        </div>
      </Container>
    </section>
  );
}

function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[560px] border-collapse font-body text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-elevated">
            <th className="px-5 py-3.5 text-left font-semibold text-text">Feature</th>
            <th className="px-5 py-3.5 text-left font-semibold text-text">Free</th>
            <th className="px-5 py-3.5 text-left font-semibold text-accent">Pro</th>
            <th className="px-5 py-3.5 text-left font-semibold text-text">Max</th>
          </tr>
        </thead>
        <tbody>
          {PRICING_COMPARISON.map((row, i) => (
            <tr
              key={row.feature}
              className={cn(
                "border-b border-border last:border-0",
                i % 2 === 0 ? "bg-surface" : "bg-bg",
              )}
            >
              <td className="px-5 py-3 font-medium text-text">{row.feature}</td>
              <td className="px-5 py-3 text-text-muted">{row.free}</td>
              <td className="px-5 py-3 font-medium text-accent">{row.pro}</td>
              <td className="px-5 py-3 text-text-muted">{row.max}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingPageClient() {
  const [annual, setAnnual] = React.useState(false);

  const displayPrice = (monthly: number | null, isFree?: boolean) => {
    if (monthly == null) return null;
    if (isFree) return 0;
    if (!annual) return monthly;
    return Math.round((monthly * 10) / 12);
  };

  return (
    <>
      <section className="border-b border-border pb-16 pt-20 sm:pb-20 sm:pt-28">
        <Container max="xl">
          <div className="max-w-[48ch]">
            <span className="section-label mb-4">Pricing</span>
            <h1 className="font-display text-[clamp(40px,6vw,72px)] font-bold leading-[0.95] tracking-tight text-text">
              Free, Pro, Max.
            </h1>
            <p className="mt-5 font-body text-lg font-light leading-relaxed text-text-muted">
              Three simple tiers. Dollar amounts are placeholders until billing ships — behavior and the usage bar
              are real.
            </p>
          </div>

          <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "min-h-9 rounded-full px-4 py-1.5 font-body text-sm font-medium transition-all duration-150",
                !annual ? "bg-text text-bg shadow-sm" : "text-text-muted hover:text-text",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "min-h-9 rounded-full px-4 py-1.5 font-body text-sm font-medium transition-all duration-150",
                annual ? "bg-text text-bg shadow-sm" : "text-text-muted hover:text-text",
              )}
            >
              Annual
              <span className={cn("ml-1.5 font-semibold text-accent", annual ? "text-accent" : "")}>−17%</span>
            </button>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container max="xl">
          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan, i) => {
              const price = displayPrice(plan.monthly, plan.isFree);
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-8",
                    plan.highlight ? "border-accent bg-text text-bg shadow-xl" : "border-border bg-surface shadow-sm",
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-block rounded-full bg-accent px-3 py-0.5 font-body text-[11px] font-semibold text-bg">
                        Most popular
                      </span>
                    </div>
                  )}

                  <div>
                    <p
                      className={cn(
                        "font-display text-lg font-bold",
                        plan.highlight ? "text-bg/70" : "text-text-muted",
                      )}
                    >
                      {plan.name}
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-body text-sm font-light",
                        plan.highlight ? "text-bg/60" : "text-text-subtle",
                      )}
                    >
                      {plan.blurb}
                    </p>
                  </div>

                  <div className="mt-8">
                    {price !== null ? (
                      <>
                        <p
                          className={cn(
                            "font-display text-[52px] font-bold leading-none tracking-tight",
                            plan.highlight ? "text-bg" : "text-text",
                          )}
                        >
                          {plan.isFree ? "" : "$"}
                          {price}
                          <span
                            className={cn(
                              "ml-1 font-body text-base font-normal",
                              plan.highlight ? "text-bg/50" : "text-text-muted",
                            )}
                          >
                            {plan.isFree ? "" : "/mo"}
                          </span>
                        </p>
                        {!plan.isFree && annual && plan.annualNote ? (
                          <p
                            className={cn(
                              "mt-1.5 font-body text-xs",
                              plan.highlight ? "text-bg/50" : "text-text-subtle",
                            )}
                          >
                            {plan.annualNote}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-accent"
                          aria-hidden
                        />
                        <span
                          className={cn(
                            "font-body text-sm",
                            plan.highlight ? "text-bg/80" : "text-text-muted",
                          )}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-10">
                    <Button
                      asChild
                      className={cn(
                        "w-full min-h-11",
                        plan.highlight && "bg-accent text-bg hover:bg-accent/90",
                      )}
                      size="lg"
                      variant={plan.highlight ? "primary" : "secondary"}
                    >
                      <Link
                        href={`${plan.cta.href}${annual && !plan.isFree ? "&billing=annual" : !plan.isFree ? "&billing=monthly" : ""}`}
                      >
                        {plan.cta.label}
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="mt-8 font-body text-sm text-text-muted">
            Need SSO, custom contracts, or more than 15 seats?{" "}
            <a
              className="font-medium text-accent underline-offset-4 hover:underline"
              href="mailto:hello@forge.app?subject=Forge%20team%20pricing"
            >
              Contact us
            </a>
            .
          </p>
        </Container>
      </section>

      <UsageExplainer />

      <section className="border-t border-border py-16 sm:py-20">
        <Container max="xl">
          <details className="group max-w-3xl">
            <summary className="cursor-pointer list-none font-body text-sm font-semibold text-accent underline-offset-4 group-open:underline">
              See full comparison →
            </summary>
            <div className="mt-6">
              <ComparisonTable />
            </div>
          </details>
        </Container>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <Container max="xl">
          <div className="mb-10">
            <span className="section-label mb-3">Billing questions</span>
            <h2 className="font-display text-[clamp(24px,3vw,38px)] font-bold leading-[1] tracking-tight text-text">
              Straight answers.
            </h2>
          </div>
          <FaqAccordion items={PRICING_FAQ} className="max-w-3xl" />
          <p className="mt-8 font-body text-xs text-text-subtle">
            Final prices and entitlements are set when Stripe products go live. Nothing here is a bill until checkout
            says so.
          </p>
        </Container>
      </section>
    </>
  );
}
