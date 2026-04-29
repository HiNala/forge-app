/**
 * i18n entry (AL-04). Identity pass today — funnel user-facing literals through {@link t}
 * so catalogs can swap in without rewriting call sites.
 */
export type TInterpolation = Record<string, string | number | boolean>;

export function t(template: string, _vars?: TInterpolation): string {
  void _vars;
  return template;
}
