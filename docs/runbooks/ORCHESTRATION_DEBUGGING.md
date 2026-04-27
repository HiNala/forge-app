# Orchestration debugging (V2 P-05+)

## Symptom: region edit changed content outside the marquee

1. Check `orchestration_runs` for the run id; confirm `unscoped_drift` flags when wired.
2. Recompute fingerprints: `region_hash.hash_outside_region` before/after HTML in a REPL.
3. If drift-fix refiner ran, logs contain `drift_repair`.

## Symptom: vision / attachment ignored

1. Verify `studio_attachments` row exists for `storage_key` and same `user_id` / `organization_id` as the request.
2. Confirm generate body includes `vision_attachment_ids` and `gather_context` logged `vision_inputs` length > 0.
3. For PDFs, ensure worker rasterization completed (`extracted_features` populated).

## Symptom: wrong model or temperature after admin change

1. `INCR forge:llm_routing:version` should bump; API pods reload policy on next `effective_model_route` call.
2. Query `llm_routing_policies` for the org and role.
3. If Redis unavailable, in-process cache may lag until version key appears — restart API or wait for TTL-free clear (cache bounded).

## Symptom: plan mode stuck / cancelled

1. Check background tasks for the plan id (future: plan execution id in `orchestration_runs` metadata).
2. User cancellation should skip subsequent steps; completed steps’ artifacts remain in `pages` / `page_revisions`.
