import * as React from "react";

const SWATCHES = [
  { name: "--color-bg", note: "Page background (cream)" },
  { name: "--color-bg-raised", note: "Cards / panels" },
  { name: "--color-bg-overlay", note: "Dialogs" },
  { name: "--color-fg-strong", note: "Hero / titles" },
  { name: "--color-fg-default", note: "Body" },
  { name: "--color-fg-muted", note: "Secondary" },
  { name: "--color-fg-faint", note: "Hints / disabled" },
  { name: "--color-accent", note: "Primary actions" },
  { name: "--color-accent-tint", note: "Hover / active nav" },
  { name: "--color-border", note: "Hairlines" },
  { name: "--color-border-strong", note: "Emphasis" },
  { name: "--color-success", note: "Positive" },
  { name: "--color-warning", note: "Approaching limit" },
  { name: "--color-danger", note: "Destructive" },
  { name: "--color-info", note: "Neutral info" },
  { name: "--color-usage-track", note: "Meter track" },
  { name: "--color-usage-fill", note: "Meter fill" },
  { name: "--color-usage-fill-approach", note: "Approaching cap" },
  { name: "--color-usage-fill-full", note: "At cap (warm amber)" },
] as const;

export default function DesignTokensPage() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="type-heading text-text">Color tokens</h2>
        <p className="type-caption mt-2 max-w-prose">
          All components should use these variables (or Tailwind semantic colors). No raw hex in app
          UI.
        </p>
        <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2">
          {SWATCHES.map(({ name, note }) => (
            <li
              key={name}
              className="flex gap-4 rounded-lg border border-border bg-surface p-4"
            >
              <div
                className="size-14 shrink-0 rounded-md border border-border"
                style={{ background: `var(${name}, #ccc)` }}
              />
              <div className="min-w-0">
                <p className="font-mono text-[12px] font-medium text-text">{name}</p>
                <p className="type-caption mt-1 text-text-muted">{note}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="type-heading text-text">Radius</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          {[
            ["--radius-sm", "6px"],
            ["--radius-md", "10px"],
            ["--radius-lg", "14px"],
            ["--radius-pill", "full"],
          ].map(([tok, px]) => (
            <div key={tok} className="flex items-center gap-3">
              <div
                className="size-12 border border-border bg-accent-tint"
                style={{ borderRadius: `var(${tok})` }}
              />
              <div>
                <p className="font-mono text-[12px] text-text">{tok}</p>
                <p className="text-xs text-text-muted">{px}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="type-heading text-text">Type scale</h2>
        <div className="mt-4 space-y-4 rounded-lg border border-border bg-surface p-6">
          <p className="type-display text-text">Display — Cormorant, rare</p>
          <p className="type-heading text-text">Heading — Manrope 600</p>
          <p className="type-subhead text-text">Subhead — card titles</p>
          <p className="type-body text-text">Body — default UI copy at 15px.</p>
          <p className="type-caption">Caption — muted supporting line.</p>
        </div>
      </section>
    </div>
  );
}
