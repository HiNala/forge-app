/**
 * Locale-backed number helpers (AL-04). Prefer these over bare `Number#toLocaleString()`.
 */

export function formatNumber(value: number, locale: string, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale || "en-US", opts).format(value);
}

/**
 * Lightweight plural glue for UI copy (“1 submission” vs “5 submissions”).
 * Uses {@link Intl.PluralRules} so future catalogs can diverge safely.
 */
export function formatPlural(
  count: number,
  locale: string,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
): string {
  const pr = new Intl.PluralRules(locale || "en-US");
  const rule = pr.select(count) as Intl.LDMLPluralRule & keyof typeof forms;
  const template =
    (forms as Record<string, string | undefined>)[rule] ?? forms.other ?? `${count}`;
  return template.replaceAll("{count}", String(count));
}
