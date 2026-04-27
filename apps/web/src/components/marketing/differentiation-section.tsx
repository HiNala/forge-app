import { Container } from "@/components/ui/container";

const CARDS: { kicker: string; body: string }[] = [
  {
    kicker: "Your data, not theirs",
    body: "Each mini-app has its own submissions, visitor analytics, and org inbox. No extra tracker stack to wire up to start.",
  },
  {
    kicker: "Take it with you",
    body: "Hand off HTML, deck files, and design exports when you need to — the door stays open, so the buy feels safer.",
  },
  {
    kicker: "AI you can steer",
    body: "Review what shipped, nudge the tone, keep brand in view — a pipeline, not a slot machine.",
  },
];

export function DifferentiationSection() {
  return (
    <section className="border-y border-border bg-bg-elevated/50 py-12 sm:py-16" aria-label="How Forge is different">
      <Container max="xl">
        <div className="grid gap-4 sm:grid-cols-3">
          {CARDS.map((c) => (
            <div
              key={c.kicker}
              className="rounded-2xl border border-border bg-surface/80 p-5 shadow-sm"
            >
              <h2 className="font-display text-base font-bold tracking-tight text-text">{c.kicker}</h2>
              <p className="mt-2 font-body text-sm font-light leading-relaxed text-text-muted">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
