import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Introducing Forge — the mini-app platform",
  description:
    "Why we built Forge, who it is for, and what ships next. From Lucy’s phone-tag problem to a single Studio for forms, landings, proposals, and decks.",
  alternates: { canonical: "/blog/introducing-forge" },
  openGraph: {
    title: "Introducing Forge",
    url: `${SITE_URL}/blog/introducing-forge`,
    type: "article",
  },
};

export default function IntroducingForgePost() {
  return (
    <Container max="md" className="py-16 sm:py-24">
      <p className="font-body text-xs font-medium uppercase tracking-wide text-text-subtle">Product</p>
      <h1 className="mt-2 font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight text-text">
        Introducing Forge as the mini-app platform
      </h1>
      <p className="mt-2 font-body text-sm text-text-muted">A note from the team — {new Date().getFullYear()}</p>

      <div className="prose prose-neutral mt-10 max-w-none font-body text-text-muted">
        <p>
          We kept hearing the same week from small businesses: the website was “fine,” the form was in one tool, the
          proposal in another, and nobody knew which link to trust. So we built Forge as one calm place to describe
          what you need, get a hosted result, and see what happened after you shared the link.
        </p>
        <p>
          A <strong className="text-text">mini-app</strong> is a single-purpose experience — a contact flow, a
          landing, a signed proposal, a pitch deck people can read in the browser. You are not wrangling a database
          you did not ask for. When you outgrow the hosted version, the export and handoff story is the point (
          <Link className="text-accent" href="/handoff">
            see what ships when
          </Link>
          ).
        </p>
        <p>
          What is next: deeper canvas surfaces for mobile and web, pricing that reads like a fair utility bill, and
          polish that feels as respectful as the best productivity tools without copying their pixels. If you are a
          contractor, a founder, or an operator who just needed a good link yesterday, we built this for you.
        </p>
        <p>
          <Link className="text-accent font-medium" href="/signup?source=blog_introducing">
            Start free
          </Link>{" "}
          — and tell us what you shipped.
        </p>
      </div>
    </Container>
  );
}
