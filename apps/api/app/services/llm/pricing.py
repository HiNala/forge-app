"""Static per-model pricing (USD per 1M tokens) — update quarterly."""

from __future__ import annotations

# Input / output price per 1M tokens in USD (approximate; mission: revisit via cron).
_MODEL_USD_PER_MTOK: dict[str, tuple[float, float]] = {
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    "claude-3-5-haiku-20241022": (0.80, 4.00),
    "claude-3-5-sonnet-20241022": (3.00, 15.00),
    "gemini-2.0-flash": (0.10, 0.40),
    "gemini-2.5-flash": (0.15, 0.60),
    "gemini-2.5-pro": (1.25, 10.00),
}


def _normalize_model_key(model: str) -> str:
    m = model.lower().strip()
    for prefix in ("openai/", "anthropic/", "gemini/", "google/"):
        if m.startswith(prefix):
            m = m.split("/", 1)[1]
    return m


def estimate_cost_cents(
    model: str,
    *,
    input_tokens: int | None,
    output_tokens: int | None,
) -> int | None:
    """Return estimated cost in fractional cents (integer cents, rounded)."""
    if input_tokens is None and output_tokens is None:
        return None
    key = _normalize_model_key(model)
    rates = None
    for k, v in _MODEL_USD_PER_MTOK.items():
        if k in key or key.endswith(k):
            rates = v
            break
    if rates is None:
        # Default heuristic for unknown models
        rates = (1.0, 4.0)
    inp = (input_tokens or 0) / 1_000_000.0 * rates[0]
    out = (output_tokens or 0) / 1_000_000.0 * rates[1]
    usd = inp + out
    # cents
    return max(0, int(round(usd * 100)))
