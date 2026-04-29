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
  annualYearlyUsd: number | null;
  annualNote: string;
  blurb: string;
  features: string[];
  highlight: boolean;
  cta: { href: string; label: string };
  isFree?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    monthly: 0,
    annualYearlyUsd: null,
    annualNote: "",
    blurb: "For trying GlideDesign.",
    features: [
      "1 published mini-app · 50 submissions / mo",
      "50 generation credits per 5 h session · 200 / week",
      "Basic analytics · “Made with GlideDesign” badge",
      "1 concurrent generation",
    ],
    highlight: false,
    isFree: true,
    cta: { href: "/signup?plan=free&source=pricing", label: "Get started" },
  },
  {
    name: "Pro",
    monthly: 20,
    annualYearlyUsd: 200,
    annualNote: "$200/yr (~$17/mo effective)",
    blurb: "For most makers.",
    features: [
      "25 published mini-apps · 5,000 submissions / mo",
      "500 generation credits per session · 5,000 / week",
      "1 custom domain · 3 seats · full analytics",
      "2 concurrent generations",
    ],
    highlight: true,
    cta: { href: "/signup?plan=pro&source=pricing", label: "Start Pro" },
  },
];

const MAX_5X = {
  monthly: 100,
  annualYearlyUsd: 1000,
  sessionCredits: 2500,
  weekCredits: 25_000,
  planSlug: "max_5x" as const,
  features: [
    "100 published mini-apps · 50,000 submissions / mo",
    "2,500 generation credits per session · 25,000 / week",
    "10 custom domains · 10 seats · priority generation",
    "5 concurrent generations",
  ],
};

const MAX_20X = {
  monthly: 200,
  annualYearlyUsd: 2000,
  sessionCredits: 10_000,
  weekCredits: 100_000,
  planSlug: "max_20x" as const,
  features: [
    "500 published mini-apps · 250,000 submissions / mo",
    "10,000 generation credits per session · 100,000 / week",
    "Unlimited domains · 25 seats · highest throughput",
    "15 concurrent generations",
  ],
};

function UsageExplainer() {
  return (
    <section className="border-t border-border bg-bg-elevated/25 py-14 sm:py-16">
      <Container max="lg">
        <div className="max-w-2xl">
          <span className="section-label">Usage</span>
          <h2 className="mt-2 font-display text-[clamp(22px,3vw,32px)] font-bold text-text">
            Session budgets and a weekly cap — shown as honest percentage bars
          </h2>
          <p className="mt-3 font-body text-sm font-light leading-relaxed text-text-muted">
            On Pro you get 500 generation credits per rolling 5-hour session (5,000 per week). That is about 100 single-page
            generations or many more small region edits. Max 5x multiplies that to 2,500 per session; Max 20x to 10,000
            — built for daily heavy use.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div
            className="surface-panel rounded-2xl p-5"
            role="img"
            aria-label="Illustrative Pro session usage at about 40 percent"
          >
            <p className="font-body text-xs font-medium text-text-subtle">Pro — current session</p>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full w-[40%] rounded-full bg-accent" />
            </div>
            <p className="mt-2 font-body text-xs text-text-muted">40% used — 500 credit session pool</p>
          </div>
          <div
            className="surface-panel rounded-2xl p-5"
            role="img"
            aria-label="Illustrative Max 5x weekly usage at about 30 percent"
          >
            <p className="font-body text-xs font-medium text-text-subtle">Max 5x — this week</p>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-border">
              <div className="h-full w-[30%] rounded-full bg-accent" />
            </div>
            <p className="mt-2 font-body text-xs text-text-muted">30% of 25,000 weekly credits</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ComparisonTable({ maxVariant }: { maxVariant: "5x" | "20x" }) {
  const maxCol = maxVariant === "5x" ? "max5" : "max20";
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/80 bg-surface shadow-sm">
      <table className="w-full min-w-[560px] border-collapse font-body text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-elevated/80">
            <th className="px-5 py-3.5 text-left font-semibold text-text">Feature</th>
            <th className="px-5 py-3.5 text-left font-semibold text-text">Free</th>
            <th className="px-5 py-3.5 text-left font-semibold text-accent">Pro</th>
            <th className="px-5 py-3.5 text-left font-semibold text-text">
              Max {maxVariant}
            </th>
          </tr>
        </thead>
        <tbody>
          {PRICING_COMPARISON.map((row, i) => (
            <tr
              key={row.feature}
              className={cn(
                "border-b border-border/80 last:border-0",
                i % 2 === 0 ? "bg-surface" : "bg-bg/60",
              )}
            >
              <td className="px-5 py-3 font-medium text-text">{row.feature}</td>
              <td className="px-5 py-3 text-text-muted">{row.free}</td>
              <td className="px-5 py-3 font-medium text-accent">{row.pro}</td>
              <td className="px-5 py-3 text-text-muted">{row[maxCol]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingPageClient() {
  const [annual, setAnnual] = React.useState(false);
  const [maxVariant, setMaxVariant] = React.useState<"5x" | "20x">("5x");

  const displayPrice = (monthly: number | null, yearly: number | null, isFree?: boolean) => {
    if (monthly == null) return null;
    if (isFree) return 0;
    if (!annual) return monthly;
    if (yearly == null) return monthly;
    return Math.round(yearly / 12);
  };

  const max = maxVariant === "5x" ? MAX_5X : MAX_20X;

  return (
    <>
      <section className="border-b border-border bg-linear-to-b from-bg to-bg-elevated/25 pb-16 pt-20 sm:pb-20 sm:pt-28">
        <Container max="xl">
          <div className="max-w-[48ch]">
            <span className="section-label mb-4">Pricing</span>
            <h1 className="font-display text-[clamp(40px,6vw,72px)] font-bold leading-[0.95] tracking-tight text-text">
              Free, Pro, Max.
            </h1>
            <p className="mt-5 font-body text-lg font-light leading-relaxed text-text-muted">
              Free, Pro, and Max (5x and 20x capacity). Prices match the published billing model; generation credits keep
              limits understandable.
            </p>
          </div>

          <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface/85 p-1 shadow-sm backdrop-blur">
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
              const price = displayPrice(plan.monthly, plan.annualYearlyUsd, plan.isFree);
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-8 transition-[transform,box-shadow,border-color] duration-200",
                    plan.highlight
                      ? "border-accent/50 bg-text text-bg shadow-xl"
                      : "surface-panel hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-block rounded-full bg-accent px-3 py-0.5 font-body text-[11px] font-semibold text-white shadow-sm">
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
                          {plan.isFree ? "Free" : "$"}
                          {!plan.isFree ? price : null}
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

            <motion.div
              key={maxVariant}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="surface-panel interaction-lift relative flex flex-col rounded-2xl p-8"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-display text-lg font-bold text-text-muted">Max</p>
                <div className="inline-flex items-center gap-0.5 rounded-full border border-border/80 bg-bg-elevated/80 p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setMaxVariant("5x")}
                    className={cn(
                      "rounded-full px-2 py-1 transition-colors",
                      maxVariant === "5x" ? "bg-text text-bg" : "text-text-muted",
                    )}
                  >
                    5x
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxVariant("20x")}
                    className={cn(
                      "rounded-full px-2 py-1 transition-colors",
                      maxVariant === "20x" ? "bg-text text-bg" : "text-text-muted",
                    )}
                  >
                    20x
                  </button>
                </div>
              </div>
              <p className="font-body text-sm font-light text-text-subtle">For power users in Studio every day</p>
              <div className="mt-8">
                <p className="font-display text-[52px] font-bold leading-none tracking-tight text-text">
                  ${displayPrice(max.monthly, max.annualYearlyUsd)}
                  <span className="ml-1 font-body text-base font-normal text-text-muted">/mo</span>
                </p>
                {annual ? (
                  <p className="mt-1.5 font-body text-xs text-text-subtle">
                    ${max.annualYearlyUsd.toLocaleString()}/yr billed annually (~$
                    {Math.round(max.annualYearlyUsd / 12)}/mo)
                  </p>
                ) : null}
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {max.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    <span className="font-body text-sm text-text-muted">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Button asChild className="w-full min-h-11" size="lg" variant="secondary">
                  <Link
                    href={`/signup?plan=${max.planSlug}&source=pricing${annual ? "&billing=annual" : "&billing=monthly"}`}
                  >
                    Start Max
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
          <p className="mt-8 font-body text-sm text-text-muted">
            Need SSO, custom contracts, or a larger org billing setup?{" "}
            <a
              className="font-medium text-accent underline-offset-4 hover:underline"
              href="mailto:hello@glidedesign.ai?subject=GlideDesign%20team%20pricing"
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
              <p className="mb-3 font-body text-xs text-text-subtle">Toggle Max 5x vs Max 20x above to match this table.</p>
              <ComparisonTable maxVariant={maxVariant} />
            </div>
          </details>
        </Container>
      </section>

      <section className="border-t border-border py-16 sm:py-20">
        <Container max="xl">
          <div className="mb-10">
            <span className="section-label mb-3">Billing questions</span>
            <h2 className="font-display text-[clamp(24px,3vw,38px)] font-bold leading-none tracking-tight text-text">
              Straight answers.
            </h2>
          </div>
          <FaqAccordion items={PRICING_FAQ} className="max-w-3xl" />
          <p className="mt-8 font-body text-xs text-text-subtle">
            Checkout shows the final charge. Plans and entitlements on this page match the V2 published model.
          </p>
        </Container>
      </section>
    </>
  );
}
