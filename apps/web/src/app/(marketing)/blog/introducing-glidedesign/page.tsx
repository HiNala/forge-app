import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Introducing GlideDesign - the AI product design tool",
  description:
    "Why we built GlideDesign, who it is for, and how it moves from idea to strategy, screens, code, and next moves.",
  alternates: { canonical: "/blog/introducing-glidedesign" },
  openGraph: {
    title: "Introducing GlideDesign",
    url: `${SITE_URL}/blog/introducing-glidedesign`,
    type: "article",
  },
};

export default function IntroducingGlideDesignPost() {
  return (
    <Container max="md" className="py-16 sm:py-24">
      <p className="font-body text-xs font-medium uppercase tracking-wide text-text-subtle">
        Product
      </p>
      <h1 className="mt-2 font-display text-[clamp(32px,4vw,48px)] font-bold leading-tight text-text">
        Introducing GlideDesign as the AI product design tool
      </h1>
      <p className="mt-2 font-body text-sm text-text-muted">
        A note from the team - {new Date().getFullYear()}
      </p>

      <div className="prose prose-neutral mt-10 max-w-none font-body text-text-muted">
        <p>
          We kept hearing the same problem from founders, operators, and small teams:
          the idea was clear, but the work split across too many tools. The page was
          in one place, the form in another, the proposal in a third, and the design
          system never caught up.
        </p>
        <p>
          GlideDesign is built around a simpler loop. Describe what you are building,
          then get a product-shaped answer: the strategy, the screens, the code, and
          the next move. A <strong className="text-text">mini-app</strong> can be a
          contact flow, landing page, signed proposal, pitch deck, or small public
          experience your customer can open right away.
        </p>
        <p>
          The rebrand is not a paint job. It changes the product posture. GlideDesign
          should feel bold like a modern design tool, clear like a serious work app,
          and fast enough that the first draft already feels useful.
        </p>
        <p>
          <Link className="font-medium text-accent" href="/signup?source=blog_introducing">
            Start free
          </Link>{" "}
          and tell us what you shipped.
        </p>
      </div>
    </Container>
  );
}
