import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { MarketingJsonLd } from "@/components/marketing/json-ld";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { marketingAssets } from "@/lib/marketing/assets";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Glide from idea to product",
  description:
    "GlideDesign turns plain English into complete product strategy, screens, code, and next moves.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GlideDesign - glide from idea to product",
    description:
      "The AI design tool that thinks like a senior product team and feels like Figma.",
    url: SITE_URL,
    siteName: "GlideDesign",
    type: "website",
  },
};

const templateCards = [
  {
    title: "Websites",
    color: "bg-marketing-lime",
    image: marketingAssets.templateCards.websites,
    caption: "Landing page, copy, sections, and share link",
  },
  {
    title: "Mobile apps",
    color: "bg-marketing-sky",
    image: marketingAssets.templateCards.mobileApps,
    caption: "User flow, screens, states, and handoff",
  },
  {
    title: "Pitch decks",
    color: "bg-marketing-coral",
    image: marketingAssets.templateCards.pitchDecks,
    caption: "Narrative, slides, charts, and export",
  },
  {
    title: "Forms",
    color: "bg-marketing-lavender",
    image: marketingAssets.templateCards.forms,
    caption: "Fields, logic, submissions, and analytics",
  },
  {
    title: "Proposals",
    color: "bg-marketing-mustard",
    image: marketingAssets.templateCards.proposals,
    caption: "Scope, pricing, proof, and signature",
  },
] as const;

const features = [
  {
    kicker: "Strategy",
    title: "Think it through.",
    body: "GlideDesign maps the offer, user flow, and data model before drawing a single screen.",
    color: "bg-marketing-lime",
  },
  {
    kicker: "Canvas",
    title: "Design with intent.",
    body: "Edit regions, compare breakpoints, and keep every screen tied to the product logic.",
    color: "bg-marketing-lavender",
  },
  {
    kicker: "Ship",
    title: "Export without lock-in.",
    body: "Publish a hosted mini-app or take clean React, PDFs, decks, and public pages with you.",
    color: "bg-marketing-mint",
  },
] as const;

const community = [
  ["Investor memo", "Maya Chen"],
  ["AI travel app", "Jon Bell"],
  ["Coffee launch", "Priya Shah"],
  ["Founder CRM", "Noah Kim"],
  ["Fitness onboarding", "Iris Cole"],
  ["Studio portfolio", "Ari Morgan"],
  ["Pricing page", "Mina Vale"],
  ["Product demo", "Theo Grant"],
] as const;

export default function MarketingHomePage() {
  return (
    <>
      <MarketingJsonLd />

      <section className="relative isolate overflow-hidden bg-bg pt-16 sm:pt-24 lg:pt-28">
        <div
          className="pointer-events-none absolute right-[-14%] top-12 h-[580px] w-[580px] rounded-full bg-(image:--brand-gradient-radial) opacity-25 blur-3xl animate-[glide-mesh_60s_ease-in-out_infinite]"
          aria-hidden
        />
        <Container
          max="xl"
          className="relative grid items-center gap-12 pb-18 lg:grid-cols-[0.9fr_1.1fr] lg:pb-24"
        >
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-text-muted shadow-sm">
              <Sparkles className="size-4 text-brand-violet" aria-hidden />
              AI design tool, product brain included
            </p>
            <h1 className="gd-enter max-w-[10ch] text-display-xl text-text">
              Glide from idea to product.
            </h1>
            <p className="gd-enter gd-enter-delay-1 mt-7 max-w-[58ch] text-[21px] font-medium leading-[1.45] text-text-muted">
              GlideDesign turns plain English into a complete product: strategy, screens,
              code, and what to do next. All in one go.
            </p>
            <div className="gd-enter gd-enter-delay-2 mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-marketing-ink px-8 text-white shadow-lg hover:bg-marketing-ink hover:shadow-xl"
              >
                <Link href="/signup?source=hero">Get started for free</Link>
              </Button>
              <Link
                href="#demo"
                className="inline-flex min-h-13 items-center gap-2 rounded-full px-4 font-body text-base font-semibold text-brand-violet hover:bg-accent-tint"
              >
                <Play className="size-4 fill-current" aria-hidden />
                Watch the 90-second demo
              </Link>
            </div>
          </div>

          <div className="gd-enter gd-enter-delay-2 relative min-h-[440px] lg:min-h-[610px]">
            <div className="absolute inset-6 rounded-[44px] bg-(image:--brand-gradient) opacity-90 shadow-2xl" />
            <div className="absolute left-0 top-8 w-[96%] rotate-[-2.5deg] overflow-hidden rounded-[36px] border border-white/70 bg-white p-3 shadow-2xl lg:w-[102%]">
              <Image
                src={marketingAssets.product.warRoomHero}
                alt="GlideDesign War Room showing strategy, canvas, and system panes."
                width={1600}
                height={1150}
                priority
                className="h-auto w-full rounded-[28px]"
              />
            </div>
            <div className="absolute bottom-0 right-0 hidden w-[42%] rotate-6 rounded-[30px] border border-white/70 bg-marketing-lime p-5 shadow-xl md:block">
              <p className="text-h3 text-marketing-ink">First run ready</p>
              <p className="mt-2 text-body-sm font-semibold text-marketing-ink/70">
                Quality 8.9, five screens, React export.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section id="templates" className="overflow-hidden bg-marketing-ink py-18 text-white sm:py-24">
        <Container max="xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-[12ch] text-display-lg">
              Start with a template. Make just about anything.
            </h2>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 font-body font-semibold text-white transition hover:bg-white hover:text-marketing-ink"
            >
              Explore templates <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-5">
            {templateCards.map((card) => (
              <Link
                key={card.title}
                href="/templates"
                className={`${card.color} gd-template-card group min-h-[430px] overflow-hidden rounded-[32px] p-5 text-marketing-ink shadow-xl`}
              >
                <h3 className="text-display-md">{card.title}</h3>
                <p className="mt-2 min-h-11 font-body font-semibold">{card.caption}</p>
                <div className="mt-7 overflow-hidden rounded-[24px] bg-white/40 shadow-2xl">
                  <Image
                    src={card.image}
                    alt={`${card.title} template preview`}
                    width={1200}
                    height={900}
                    className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <span className="mt-5 inline-flex translate-y-2 items-center gap-2 rounded-full bg-marketing-ink px-4 py-2 font-body text-sm font-bold text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  View templates <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-marketing-ink py-28 text-white">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_70%_40%,color-mix(in_oklch,var(--brand-coral)_55%,transparent),transparent_38%),radial-gradient(circle_at_20%_70%,color-mix(in_oklch,var(--brand-violet)_55%,transparent),transparent_35%)] opacity-80"
          aria-hidden
        />
        <Container max="xl" className="relative">
          <h2 className="max-w-[12ch] text-display-xl">
            Build the product, not just the screens.
          </h2>
        </Container>
      </section>

      <section id="demo" className="bg-bg py-20 sm:py-28">
        <Container max="xl">
          <div className="mb-12 max-w-4xl">
            <p className="text-caption font-bold uppercase tracking-[0.18em] text-brand-violet">
              Product brain
            </p>
            <h2 className="mt-3 text-display-md text-text">
              Prompt, code, and design from first idea to final product.
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {features.map((feature, index) => (
              <article key={feature.title} className="rounded-[32px] border border-border bg-surface p-5 shadow-md">
                <div className={`mb-8 overflow-hidden rounded-[24px] ${feature.color} p-4`}>
                  <div className="rounded-[20px] border border-marketing-ink/10 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="rounded-full bg-marketing-ink px-3 py-1 text-caption font-bold text-white">
                        {feature.kicker}
                      </span>
                      <span className="size-3 rounded-full bg-brand-coral" />
                    </div>
                    <div className="grid h-44 grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-marketing-mint/60" />
                      <div className="rounded-2xl bg-marketing-lavender/70" />
                      <div className="rounded-2xl bg-marketing-mustard/70" />
                    </div>
                  </div>
                </div>
                <p className="text-caption font-semibold uppercase tracking-[0.18em] text-text-muted">
                  0{index + 1}
                </p>
                <h3 className="mt-3 text-h2 text-text">{feature.title}</h3>
                <p className="mt-3 text-body-sm text-text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-bg py-20">
        <Container max="xl">
          <h2 className="mb-8 text-display-md text-text">Explore what people are making</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {community.map(([name, creator], index) => (
              <div key={name}>
                <div className="overflow-hidden rounded-[24px] bg-white shadow-md">
                  <Image
                    src={marketingAssets.community[index] ?? marketingAssets.templateCards.websites}
                    alt={`${name} community template preview`}
                    width={1200}
                    height={900}
                    className="aspect-[4/3] w-full object-cover transition duration-300 hover:scale-[1.03]"
                  />
                </div>
                <p className="mt-3 font-body font-bold text-text">{name}</p>
                <p className="text-caption">by {creator}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-marketing-lavender py-20 sm:py-28">
        <Container max="xl" className="grid items-center gap-12 lg:grid-cols-[1fr_360px]">
          <blockquote className="text-display-lg text-marketing-ink">
            &quot;GlideDesign is the first AI design tool that actually understands what we&apos;re building.&quot;
          </blockquote>
          <div className="rounded-[32px] bg-white p-6 shadow-lg">
            <Image
              src={marketingAssets.avatars[0] ?? "/marketing/avatars/persona-1.svg"}
              alt="Ari Morgan"
              width={160}
              height={160}
              className="mb-5 size-20 rounded-full"
            />
            <p className="font-body text-lg font-bold text-text">Ari Morgan</p>
            <p className="text-body-sm text-text-muted">Founder, Northstar Labs</p>
          </div>
        </Container>
      </section>

      <section className="bg-bg py-20 sm:py-28">
        <Container max="xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-[12ch] text-display-md text-text">
              Pricing that does not get in the way.
            </h2>
            <Link href="/pricing" className="font-body font-bold text-brand-violet hover:underline">
              See full pricing
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              ["Free", "$0", "Strict limits, branded public badge, and 100 weekly credits."],
              ["Pro", "$50", "2,500 weekly credits, custom domains, exports, and priority queue."],
              ["Max", "$100", "10,000 weekly credits, multi-seat, SSO, and dedicated support."],
            ].map(([plan, price, copy]) => (
              <article
                key={plan}
                className={`${plan === "Pro" ? "gd-recommended-card border-transparent" : "border-border"} rounded-[32px] border bg-surface p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl`}
              >
                <h3 className="text-display-md text-text">{plan}</h3>
                <p className="mt-4 font-display text-[64px] font-extrabold leading-none tracking-[-0.04em] text-text">
                  {price}
                </p>
                <p className="mt-4 text-body-sm text-text-muted">{copy}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-marketing-mustard py-24 sm:py-32">
        <Container max="xl" className="text-center">
          <h2 className="mx-auto max-w-[11ch] text-display-xl text-marketing-ink">
            Get started for free
          </h2>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-marketing-ink px-10 text-white shadow-xl hover:bg-marketing-ink"
          >
            <Link href="/signup?source=final-cta">Glide now</Link>
          </Button>
        </Container>
      </section>
    </>
  );
}
