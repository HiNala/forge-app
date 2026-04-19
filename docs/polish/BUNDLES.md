# Bundle size (Mission FE-07)

Budgets: shared client bundle ≤ **180KB** gzipped; per-route incremental ≤ **100KB** gzipped (PRD).

## Analyzer

From `apps/web`:

```bash
set ANALYZE=true
pnpm run build
```

(On Unix: `ANALYZE=true pnpm run build`.)

`next.config.ts` enables `@next/bundle-analyzer` when `ANALYZE=true`. Open the generated HTML report and record sizes here after each major release.

## Code-splitting notes (already in tree)

- **Recharts** loads only on analytics routes via `components/analytics/analytics-views-lazy.tsx` (`dynamic(..., { ssr: false })`).
- **canvas-confetti** is dynamically imported in `lib/confetti.ts` for first-publish celebration.

## Recording template

| Route / chunk | Gzipped size | Date | Notes |
|---------------|--------------|------|--------|
| _TBD_ | | | |
