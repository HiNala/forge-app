import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on AI product design, launches, templates, and GlideDesign craft.",
};

const posts = [
  {
    href: "/blog/introducing-glidedesign",
    title: "Introducing GlideDesign",
    excerpt: "The new identity for an AI design tool that moves from idea to product.",
  },
  {
    href: "/roadmap",
    title: "What ships next",
    excerpt: "A practical roadmap for product brain, canvases, exports, and team workflows.",
  },
];

export default function BlogIndexPage() {
  return (
    <Container max="xl" className="py-16 sm:py-24">
      <h1 className="text-display-lg text-text">Blog</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.href} href={post.href} className="rounded-[32px] border border-border bg-surface p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
            <div className="mb-8 aspect-video rounded-[24px] bg-[image:var(--brand-gradient)]" />
            <h2 className="text-h3 text-text">{post.title}</h2>
            <p className="mt-3 text-body-sm text-text-muted">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
