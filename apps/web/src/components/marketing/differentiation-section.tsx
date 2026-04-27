import { Container } from "@/components/ui/container";

const CARDS: { kicker: string; body: string }[] = [
  {
    kicker: "Your data, not theirs",
    body: "Each mini-app has its own submissions, visitor analytics, and org inbox. No extra tracker stack to wire up to start.",
  },
  {
    kicker: "Take it with you",
    body: "Clean exports when you need them — HTML, decks, PDFs, design handoff. Want to switch later? You’re not locked in.",
  },
  {
    kicker: "AI you actually want to use",
    body: "Review panel, brand-aware composer, and a real pipeline — so you steer output instead of rolling the dice.",
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
