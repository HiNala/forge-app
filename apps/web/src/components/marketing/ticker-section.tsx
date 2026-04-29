const PROMPTS = [
  "a booking page for a local handyman",
  "a weekly specials menu for my café",
  "a photography portfolio contact form",
  "a gym class schedule with sign-ups",
  "a pet grooming appointment page",
  "a food truck's weekly location tracker",
  "a tutoring service landing page",
  "an RSVP page for a dinner event",
  "a private chef inquiry form",
  "a team dinner booking page",
  "a daily menu board for a restaurant",
  "a consultation booking for a therapist",
];

/** BP-05 — static wrap strip (no infinite marquee ticker). */
export function TickerSection() {
  return (
    <div className="border-y border-border bg-surface py-4">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-3 px-4">
        {PROMPTS.map((p) => (
          <span
            key={p}
            className="inline-flex shrink-0 items-center gap-2.5 px-3 font-body text-[13px] font-normal text-text-muted"
          >
            <span className="inline-block size-1 shrink-0 rounded-full bg-accent" aria-hidden />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
