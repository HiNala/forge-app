/** Pure helpers for form funnel analytics (unit-tested; no fabricated curves). */

export type FunnelStepDatum = { step: string; value: number };

export function buildFormFunnelSteps(input: {
  form_starts: number;
  sessions_with_field_touch: number;
  form_submits: number;
}): FunnelStepDatum[] {
  return [
    { step: "Form start", value: input.form_starts },
    { step: "Field interaction", value: input.sessions_with_field_touch },
    { step: "Submitted", value: input.form_submits },
  ];
}

export type FieldRow = { field: string; touches: number; touch_rate_vs_starters: number };

/** Worst drop-off first: lowest share-of-starters interaction rate at the top. */
export function sortFieldsByDropoffSeverity(fields: FieldRow[]): FieldRow[] {
  return [...fields].sort((a, b) => a.touch_rate_vs_starters - b.touch_rate_vs_starters);
}

export function formatAvgTimeOnPage(ms: number): string {
  if (ms <= 0) return "0s";
  const sec = Math.round(ms / 1000);
  if (sec < 120) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
