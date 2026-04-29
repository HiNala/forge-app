/**
 * Locale-aware money formatting (AL-02 / BP-04). Zero-decimal currencies use no fraction digits.
 */
const ZERO_DECIMAL_CCY = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]);

export function formatCurrency(cents: number, currency: string, locale: string): string {
  const cur = currency.trim().toUpperCase() || "USD";
  const zero = ZERO_DECIMAL_CCY.has(cur);
  return new Intl.NumberFormat(locale || "en-US", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: zero ? 0 : 2,
    maximumFractionDigits: zero ? 0 : 2,
  }).format(cents / 100);
}
