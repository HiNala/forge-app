"use client";

import Link from "next/link";
import * as React from "react";
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
import { Switch } from "@/components/ui/switch";
import { PRICING_COMPARISON, PRICING_FAQ } from "@/lib/marketing-content";

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
    annualNote: "2 months free on annual",
    blurb: "Solo operators and first pages.",
    features: [
      "Up to 5 live pages",
      "Form submissions inbox",
      "Basic analytics (30 days)",
      "Forge-hosted links",
      "Email support",
    ],
    highlight: false,
    cta: { href: "/signup?plan=starter&source=pricing", label: "Start trial" },
  },
  {
    name: "Pro",
    monthly: 49,
    annualNote: "2 months free on annual",
    blurb: "Teams that ship pages every week.",
    features: [
      "Higher page & submission limits",
      "Custom domain + TLS",
      "Automations & calendar",
      "Priority support",
      "12-month analytics retention",
    ],
    highlight: true,
    cta: { href: "/signup?plan=pro&source=pricing", label: "Start Pro trial" },
  },
  {
    name: "Enterprise",
    monthly: null,
    annualNote: "",
    blurb: "Security, SSO, and volume pricing.",
    features: ["Dedicated support", "SLA & invoicing", "EU options (roadmap)", "Custom contracts"],
    highlight: false,
    cta: { href: "mailto:hello@forge.app?subject=Forge%20Enterprise", label: "Contact sales", external: true },
  },
];

export function PricingPageClient() {
  const [annual, setAnnual] = React.useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = React.useState(false);

  const displayPrice = (monthly: number | null) => {
    if (monthly == null) return "Let’s talk";
    if (!annual) return `$${monthly}`;
    const yr = Math.round(monthly * 10);
    return `$${Math.round(yr / 12)}`;
  };

  const periodLabel = (monthly: number | null) => {
    if (monthly == null) return "";
    return annual ? "/mo, billed annually" : "/mo";
  };

  return (
    <>
      <Container max="xl" className="py-12 sm:py-16">
        <div className="mx-auto max-w-[65ch] text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-text sm:text-5xl">
            Simple pricing
          </h1>
          <p className="mt-4 text-lg text-text-muted">
            Start with a trial. Upgrade when Forge is in your weekly workflow.
          </p>
          <div
            className="mt-8 flex items-center justify-center gap-3 text-sm font-medium text-text-muted"
            role="group"
            aria-label="Billing period"
          >
            <span className={!annual ? "text-text" : ""}>Monthly</span>
            <Switch
              checked={annual}
              onCheckedChange={setAnnual}
              aria-label="Toggle annual billing"
            />
            <span className={annual ? "text-text" : ""}>
              Annual <span className="text-accent">(2 mo. free)</span>
            </span>
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-2xl border p-8 shadow-sm ${
                p.highlight
                  ? "border-accent bg-surface shadow-md ring-1 ring-accent-mid"
                  : "border-border bg-surface"
              }`}
            >
              <h2 className="font-display text-2xl font-semibold text-text">{p.name}</h2>
              <p className="mt-2 text-sm text-text-muted">{p.blurb}</p>
              <p className="mt-6 font-display text-3xl font-semibold text-text">
                {displayPrice(p.monthly)}
                <span className="text-lg font-normal text-text-muted">
                  {periodLabel(p.monthly)}
                </span>
              </p>
              {p.monthly != null && p.annualNote ? (
                <p className="mt-1 text-xs text-text-subtle">{p.annualNote}</p>
              ) : null}
              <ul className="mt-8 flex-1 space-y-3 text-sm text-text-muted">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent" aria-hidden>
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {p.name === "Enterprise" ? (
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    variant={p.highlight ? "primary" : "secondary"}
                    onClick={() => setEnterpriseOpen(true)}
                  >
                    Contact us
                  </Button>
                ) : p.cta.external ? (
                  <Button asChild className="w-full" size="lg" variant="secondary">
                    <a href={p.cta.href}>{p.cta.label}</a>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="w-full"
                    size="lg"
                    variant={p.highlight ? "primary" : "secondary"}
                  >
                    <Link
                      href={`${p.cta.href}${annual ? "&billing=annual" : "&billing=monthly"}`}
                    >
                      {p.cta.label}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20">
          <h2 className="text-center font-display text-2xl font-semibold text-text">
            Compare plans
          </h2>
          <div className="mt-8 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-elevated">
                  <th className="px-4 py-3 font-medium text-text">Feature</th>
                  <th className="px-4 py-3 font-medium text-text">Starter</th>
                  <th className="px-4 py-3 font-medium text-text">Pro</th>
                  <th className="px-4 py-3 font-medium text-text">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text-muted">{row.feature}</td>
                    <td className="px-4 py-3">{row.starter}</td>
                    <td className="px-4 py-3">{row.pro}</td>
                    <td className="px-4 py-3">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-20 mx-auto max-w-[65ch]">
          <h2 className="text-center font-display text-2xl font-semibold text-text">
            Billing FAQ
          </h2>
          <FaqAccordion items={PRICING_FAQ} className="mt-8" />
        </div>

        <p className="mt-12 text-center text-sm text-text-subtle">
          Prices are indicative until Stripe products are wired; trials and upgrades follow checkout
          rules at launch.
        </p>
      </Container>

      <Dialog open={enterpriseOpen} onOpenChange={setEnterpriseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Enterprise</DialogTitle>
            <DialogDescription>
              Tell us about seats, compliance, and timeline — we’ll reply within two business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="co">Company</Label>
              <Input id="co" placeholder="Acme Co." className="mt-1" />
            </div>
            <div>
              <Label htmlFor="em">Work email</Label>
              <Input id="em" type="email" placeholder="you@company.com" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setEnterpriseOpen(false)}>
              Close
            </Button>
            <Button asChild type="button">
              <a href="mailto:hello@forge.app?subject=Forge%20Enterprise%20inquiry">
                Open email
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
