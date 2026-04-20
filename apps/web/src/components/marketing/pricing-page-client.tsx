"use client";

import Link from "next/link";
import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { PRICING_COMPARISON, PRICING_FAQ } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  monthly: number | null;
  annualNote: string;
  blurb: string;
  features: string[];
  highlight: boolean;
  cta: { href: string; label: string; external?: boolean };
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    monthly: 19,
    annualNote: "Save 2 months on annual",
    blurb: "Solo operators and first pages.",
    features: [
      "Up to 5 live pages",
      "Form submissions inbox",
      "Basic analytics (30 days)",
      "Forge-hosted links",
      "Email support",
    ],
    highlight: false,
    cta: { href: "/signup?plan=starter&source=pricing", label: "Start free trial" },
  },
  {
    name: "Pro",
    monthly: 49,
    annualNote: "Save 2 months on annual",
    blurb: "Teams that ship pages every week.",
    features: [
      "50 live pages",
      "Custom domain + TLS",
      "Automations & calendar sync",
      "12-month analytics retention",
      "Priority support",
    ],
    highlight: true,
    cta: { href: "/signup?plan=pro&source=pricing", label: "Start Pro trial" },
  },
  {
    name: "Enterprise",
    monthly: null,
    annualNote: "",
    blurb: "Security, SSO, and volume pricing.",
    features: [
      "Unlimited pages",
      "SSO / SAML",
      "Dedicated support + SLA",
      "NET30 invoicing",
      "Custom contracts",
    ],
    highlight: false,
    cta: { href: "mailto:hello@forge.app?subject=Forge%20Enterprise", label: "Contact sales", external: true },
  },
];

export function PricingPageClient() {
  const [annual, setAnnual] = React.useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = React.useState(false);

  const displayPrice = (monthly: number | null) => {
    if (monthly == null) return null;
    if (!annual) return monthly;
    return Math.round((monthly * 10) / 12);
  };

  return (
    <>
      {/* Header */}
      <section className="border-b border-border pb-16 pt-20 sm:pb-20 sm:pt-28">
        <Container max="xl">
          <div className="max-w-[48ch]">
            <span className="section-label mb-4">Pricing</span>
            <h1 className="font-display text-[clamp(40px,6vw,72px)] font-bold leading-[0.95] tracking-tight text-text">
              Start free.
              <br />
              <span className="text-accent">Pay when it works.</span>
            </h1>
            <p className="mt-5 font-body text-lg font-light leading-relaxed text-text-muted">
              Every plan includes a 14-day trial. No card until you pick a tier.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "min-h-9 rounded-full px-4 py-1.5 font-body text-sm font-medium transition-all duration-150",
                !annual
                  ? "bg-text text-bg shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "min-h-9 rounded-full px-4 py-1.5 font-body text-sm font-medium transition-all duration-150",
                annual
                  ? "bg-text text-bg shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              Annual
              <span className={cn("ml-1.5 font-semibold text-accent", annual ? "text-accent" : "")}>
                −17%
              </span>
            </button>
          </div>
        </Container>
      </section>

      {/* Plans */}
      <section className="py-16 sm:py-20">
        <Container max="xl">
          <div className="grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan, i) => {
              const price = displayPrice(plan.monthly);
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-8",
                    plan.highlight
                      ? "border-accent bg-text text-bg shadow-xl"
                      : "border-border bg-surface shadow-sm",
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
                          ${price}
                          <span
                            className={cn(
                              "ml-1 font-body text-base font-normal",
                              plan.highlight ? "text-bg/50" : "text-text-muted",
                            )}
                          >
                            /mo
                          </span>
                        </p>
                        {annual && plan.annualNote ? (
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
                    ) : (
                      <p
                        className={cn(
                          "font-display text-[40px] font-bold leading-none tracking-tight",
                          plan.highlight ? "text-bg" : "text-text",
                        )}
                      >
                        Custom
                      </p>
                    )}
                  </div>

                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            plan.highlight ? "text-accent" : "text-accent",
                          )}
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
                    {plan.name === "Enterprise" ? (
                      <Button
                        type="button"
                        className="w-full min-h-11"
                        size="lg"
                        variant="secondary"
                        onClick={() => setEnterpriseOpen(true)}
                      >
                        Contact sales
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className={cn(
                          "w-full min-h-11",
                          plan.highlight &&
                            "bg-accent text-bg hover:bg-accent/90",
                        )}
                        size="lg"
                        variant={plan.highlight ? "primary" : "secondary"}
                      >
                        <Link
                          href={`${plan.cta.href}${annual ? "&billing=annual" : "&billing=monthly"}`}
                        >
                          {plan.cta.label}
                        </Link>
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Comparison table */}
      <section className="border-t border-border py-16 sm:py-20">
        <Container max="xl">
          <div className="mb-10">
            <span className="section-label mb-3">Full comparison</span>
            <h2 className="font-display text-[clamp(24px,3vw,38px)] font-bold leading-[1] tracking-tight text-text">
              Every feature, side by side.
            </h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] border-collapse font-body text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-elevated">
                  <th className="px-5 py-3.5 text-left font-semibold text-text">Feature</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-text">Starter</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-accent">Pro</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-text">Enterprise</th>
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
                    <td className="px-5 py-3 text-text-muted">{row.starter}</td>
                    <td className="px-5 py-3 font-medium text-accent">{row.pro}</td>
                    <td className="px-5 py-3 text-text-muted">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* FAQ */}
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
            Prices are indicative until Stripe products are wired; trials and upgrades follow checkout rules at launch.
          </p>
        </Container>
      </section>

      {/* Enterprise dialog */}
      <Dialog open={enterpriseOpen} onOpenChange={setEnterpriseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Enterprise inquiry</DialogTitle>
            <DialogDescription className="font-body text-sm text-text-muted">
              Tell us about seats, compliance requirements, and timeline — we reply within two business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="co" className="font-body text-sm font-medium">Company</Label>
              <Input id="co" placeholder="Acme Co." className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="em" className="font-body text-sm font-medium">Work email</Label>
              <Input id="em" type="email" placeholder="you@company.com" className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setEnterpriseOpen(false)}>
              Cancel
            </Button>
            <Button asChild>
              <a href="mailto:hello@forge.app?subject=Forge%20Enterprise%20inquiry">
                Send inquiry
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
