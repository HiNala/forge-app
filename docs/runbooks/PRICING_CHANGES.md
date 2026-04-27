# Changing prices or credit costs

1. Update **`docs/billing/PRICING_MODEL.md`** first (source of truth).
2. Update **`compute_charge` / tables** in `app/services/billing/credits.py` and any marketing copy.
3. **Never** remove capacity from existing paying subscribers without 30+ days notice; use **grandfathering** in `org_feature_flags` or Stripe price lock on the subscription.
4. Deploy API before marketing pages, or the same day with feature flag if needed.
5. Run `openapi-typescript` in `apps/web` if API response shapes change.
