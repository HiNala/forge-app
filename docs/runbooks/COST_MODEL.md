# Cost model (rough orders of magnitude)

**Not financial advice.** Update with real Railway invoices and provider dashboards.

| Scale | Rough monthly drivers |
|-------|------------------------|
| **~100 active orgs** | Small Railway compute (web, api, worker), small Postgres/Redis, R2 storage, Resend starter, LLM usage dominates if heavy Studio use |
| **~1k** | Scale API/worker replicas; Postgres storage; Stripe volume |
| **~10k** | Multi-region later; dedicated Postgres; LLM budget caps per tenant tier |

## LLM budget

- Set **provider account budgets/alerts** (OpenAI, Anthropic, etc.).
- Forge enforces **per-org quotas** via `subscription_usage` and `billing_gate` (pages/submissions); extend with per-tier LLM token caps as needed.

## Monitoring

Track cost per provider in their dashboards; correlate with `subscription_usage` token fields and internal metrics.
