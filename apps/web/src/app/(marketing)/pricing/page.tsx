import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free for getting started. Pro and Max for shipping serious work with GlideDesign.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing · GlideDesign",
    description: "Free, Pro $50, and Max $100. Honest limits, clear credits, serious output.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
};

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "per month",
    cta: "Get started",
    href: "/signup?plan=free&source=pricing",
    color: "bg-marketing-lime",
    features: [
      "100 generation credits per week",
      "3 published mini-apps",
      "GlideDesign branded badge",
      "Community support",
      "No custom domains",
      "No priority queue",
    ],
  },
  {
    name: "Pro",
    price: "$50",
    cadence: "per month, billed monthly",
    cta: "Upgrade to Pro",
    href: "/signup?plan=pro&source=pricing",
    color: "bg-[image:var(--brand-gradient)] text-white",
    recommended: true,
    features: [
      "2,500 generation credits per week",
      "Unlimited mini-apps",
      "Custom domains",
      "All export formats",
      "Email support",
      "Priority queue",
    ],
  },
  {
    name: "Max",
    price: "$100",
    cadence: "per month, billed monthly",
    cta: "Upgrade to Max",
    href: "/signup?plan=max&source=pricing",
    color: "bg-marketing-lavender",
    features: [
      "10,000 generation credits per week",
      "Everything in Pro",
      "Multi-seat workspace",
      "SSO",
      "Priority generation tier",
      "Dedicated support",
    ],
  },
] as const;

const comparison = [
  ["Weekly generation credits", "100", "2,500", "10,000"],
  ["Published mini-apps", "3", "Unlimited", "Unlimited"],
  ["Custom domains", "No", "Yes", "Yes"],
  ["Exports", "Core", "All formats", "All formats"],
  ["Support", "Community", "Email", "Dedicated"],
  ["Free badge", "Required", "Removed", "Removed"],
] as const;

export default function PricingPage() {
  return (
    <>
      <section className="bg-marketing-sky py-20 sm:py-28">
        <Container max="xl">
          <div className="max-w-4xl">
            <p className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-text-muted">
              GlideDesign pricing
            </p>
            <h1 className="text-display-xl text-marketing-ink">Pricing that does not get in the way.</h1>
            <p className="mt-6 max-w-2xl text-[22px] font-medium leading-[1.45] text-marketing-ink/75">
              Free for getting started. Pro and Max for shipping serious work.
            </p>
            <div className="mt-8 inline-flex rounded-full bg-white p-1 shadow-md">
              <span className="rounded-full bg-marketing-ink px-5 py-2 font-body text-sm font-bold text-white">Monthly</span>
              <span className="px-5 py-2 font-body text-sm font-bold text-text-muted">Annual saves 17%</span>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-bg py-16 sm:py-24">
        <Container max="xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const recommended = "recommended" in plan && plan.recommended;
              return (
              <article
                key={plan.name}
                className={`relative rounded-[36px] border border-border p-6 shadow-lg ${recommended ? "bg-marketing-ink text-white ring-4 ring-brand-violet/20" : "bg-surface text-text"}`}
              >
                {recommended ? (
                  <span className="absolute right-6 top-6 rounded-full bg-white px-3 py-1 text-caption font-bold text-marketing-ink">
                    Recommended
                  </span>
                ) : null}
                <div className={`mb-8 inline-flex rounded-[24px] px-5 py-4 ${plan.color}`}>
                  <h2 className="text-display-md">{plan.name}</h2>
                </div>
                <p className="font-display text-[88px] font-extrabold leading-none tracking-[-0.08em]">
                  {plan.price}
                </p>
                <p className={`mt-2 text-caption ${recommended ? "text-white/70" : "text-text-muted"}`}>{plan.cadence}</p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 font-body text-sm font-semibold">
                      <Check className={`mt-0.5 size-4 shrink-0 ${recommended ? "text-marketing-lime" : "text-brand-violet"}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="lg" className="mt-8 w-full">
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </article>
            );
            })}
          </div>

          <div className="mt-16 overflow-x-auto rounded-[28px] border border-border bg-surface shadow-md">
            <table className="w-full min-w-[720px] border-collapse text-left font-body text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-text">Feature</th>
                  <th className="px-6 py-4 text-text">Free</th>
                  <th className="px-6 py-4 text-brand-violet">Pro</th>
                  <th className="px-6 py-4 text-text">Max</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(([feature, free, pro, max]) => (
                  <tr key={feature} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 font-semibold text-text">{feature}</td>
                    <td className="px-6 py-4 text-text-muted">{free}</td>
                    <td className="px-6 py-4 font-semibold text-brand-violet">{pro}</td>
                    <td className="px-6 py-4 text-text-muted">{max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12 rounded-[32px] bg-marketing-mustard p-8 text-marketing-ink">
            <h2 className="text-h2">Larger team or specific needs?</h2>
            <p className="mt-2 text-body-sm">Talk to us about procurement, security review, and rollout support.</p>
            <Link href="mailto:hello@glidedesign.ai" className="mt-5 inline-flex rounded-full bg-marketing-ink px-5 py-3 font-body font-bold text-white">
              Talk to us
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
