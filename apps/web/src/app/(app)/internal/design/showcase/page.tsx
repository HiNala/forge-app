"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsageBar } from "@/components/usage/UsageBar";

export default function DesignShowcasePage() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="type-heading text-text">Buttons</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button">Primary action</Button>
          <Button type="button" variant="secondary">
            Secondary
          </Button>
          <Button type="button" variant="ghost">
            Tertiary
          </Button>
        </div>
      </section>

      <section>
        <h2 className="type-heading text-text">Inputs</h2>
        <div className="mt-4 max-w-sm space-y-3">
          <Input placeholder="Single-line field" aria-label="Demo" />
        </div>
      </section>

      <section>
        <h2 className="type-heading text-text">Usage bars</h2>
        <p className="type-caption mt-1 max-w-prose">
          Same component as Settings → Usage, Studio footer, and Admin pulse.
        </p>
        <div className="mt-6 max-w-xl space-y-8 rounded-lg border border-border bg-surface p-6">
          <UsageBar
            label="Current session"
            description="Example at 42% — calm accent fill"
            percent={42}
            used={420}
            cap={1000}
            resetText="Resets in 1 hr 19 min"
          />
          <UsageBar
            label="Approaching limit"
            description="Shown at 95%+ with tag"
            percent={96}
            used={960}
            cap={1000}
            resetText="Resets tomorrow"
          />
          <UsageBar
            label="At cap"
            description="Warm amber fill — not an error"
            percent={100}
            used={1000}
            cap={1000}
            resetText="Resets in 1 hr 19 min"
          />
        </div>
        <div className="dark mt-6 max-w-xl rounded-lg bg-bg p-6 text-text">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wide text-text-muted">Dark panel</p>
          <UsageBar
            variant="inverse"
            label="generation credits"
            percent={38}
            used={380}
            cap={1000}
            resetText="Resets in 2h 14m"
          />
        </div>
      </section>
    </div>
  );
}
