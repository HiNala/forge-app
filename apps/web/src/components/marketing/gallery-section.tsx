"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { TEMPLATE_CARDS } from "@/lib/marketing-content";
import { cn } from "@/lib/utils";

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  Forms:       { bg: "oklch(50% 0.15 192 / 0.1)",  text: "oklch(50% 0.15 192)" },
  Events:      { bg: "oklch(58% 0.19 280 / 0.1)",  text: "oklch(58% 0.19 280)" },
  Hospitality: { bg: "oklch(67% 0.16 72 / 0.12)",  text: "oklch(67% 0.16 72)" },
  Proposals:   { bg: "oklch(55% 0.18 152 / 0.1)",  text: "oklch(55% 0.18 152)" },
  Landing:     { bg: "oklch(60% 0.18 350 / 0.1)",  text: "oklch(60% 0.18 350)" },
  Booking:     { bg: "oklch(50% 0.15 192 / 0.1)",  text: "oklch(50% 0.15 192)" },
};

function GalleryCard({
  href,
  name,
  tag,
  description,
  index,
}: {
  href: string;
  name: string;
  tag: string;
  description: string;
  index: number;
}) {
  const color = TAG_COLORS[tag] ?? TAG_COLORS["Forms"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8%" }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={href}
        className={cn(
          "surface-panel group block overflow-hidden rounded-2xl",
          "transition-[transform,box-shadow,border-color] duration-200 ease-out",
          "hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        )}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-bg-elevated">
          {/* Gradient base */}
          <div
            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0"
            style={{
              background: `linear-gradient(135deg, ${color.bg.replace("0.1)", "0.25)")} 0%, var(--bg-elevated) 60%, var(--bg) 100%)`,
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `linear-gradient(135deg, ${color.bg.replace("0.1)", "0.4)")} 0%, ${color.bg} 60%, var(--bg-elevated) 100%)`,
            }}
            aria-hidden
          />
          {/* Decorative page chrome lines */}
          <div className="absolute inset-4 flex flex-col gap-2 opacity-30 group-hover:opacity-50 transition-opacity duration-300" aria-hidden>
            <div className="h-2.5 w-2/5 rounded-full" style={{ background: color.text }} />
            <div className="h-1.5 w-3/4 rounded-full bg-current opacity-20" />
            <div className="h-1.5 w-1/2 rounded-full bg-current opacity-15" />
            <div className="mt-2 h-8 w-full rounded-lg opacity-10" style={{ background: color.text }} />
            <div className="h-1.5 w-5/6 rounded-full bg-current opacity-10" />
            <div className="h-1.5 w-2/3 rounded-full bg-current opacity-10" />
          </div>
          {/* Tag badge in thumbnail corner */}
          <div className="absolute right-3 top-3">
            <span
              className="inline-block rounded-full px-2.5 py-0.5 font-body text-[10px] font-semibold"
              style={{ background: color.bg, color: color.text }}
            >
              {tag}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5">
          <p className="font-display text-[17px] font-bold leading-snug text-text">
            {name}
          </p>
          <p className="mt-1.5 font-body text-sm font-light leading-[1.65] text-text-muted">
            {description}
          </p>
          <p
            className="mt-4 font-body text-xs font-semibold transition-colors duration-150 group-hover:underline underline-offset-4"
            style={{ color: color.text }}
          >
            View example →
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export function GallerySection() {
  return (
    <section className="border-t border-border py-20 sm:py-24">
      <Container max="xl">
        {/* Editorial header */}
        <div className="mb-14 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="section-label mb-3">What you can build</span>
          <h2 className="font-display text-[clamp(28px,3.5vw,46px)] font-bold leading-none tracking-tight text-text">
              Six examples, ready now.
            </h2>
          </div>
          <Link
            href="/examples"
            className="shrink-0 font-body text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            See all templates →
          </Link>
        </div>

        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_CARDS.map((t, i) => (
            <li key={t.slug}>
              <GalleryCard
                href={`/examples/${t.slug}`}
                name={t.name}
                tag={t.tag}
                description={t.description}
                index={i}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
