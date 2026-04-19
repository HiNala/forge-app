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

export function TickerSection() {
  const doubled = [...PROMPTS, ...PROMPTS];

  return (
    <div className="overflow-hidden border-y border-border bg-surface py-3">
      <div className="ticker-track">
        {doubled.map((p, i) => (
          <span
            key={i}
            className="inline-flex shrink-0 items-center gap-2.5 px-5 font-body text-[13px] font-normal text-text-muted"
          >
            <span
              className="inline-block size-1 shrink-0 rounded-full bg-accent"
              aria-hidden
            />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
