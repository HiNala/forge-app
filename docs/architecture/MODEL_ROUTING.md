# Model routing (production, V2 P-05)

## Sources of truth

1. **Code defaults** — `app/services/llm/llm_router.py` `ROUTES` (Mission O-01).
2. **Database** — `llm_routing_policies`  
   - `organization_id IS NULL` — platform defaults (partial unique index on `role`).  
   - `organization_id` set — per-org override (unique on `(organization_id, role)`).
3. **Cache invalidation** — `forge:llm_routing:version` Redis key, incremented by `bump_routing_version` on admin changes; optional `forge:llm_routing:invalidate` pub/sub for sub-second fan-out.

## Resolution

`effective_model_route(db, redis, role=..., organization_id=...)` in `routing_config_service.py` merges platform + org policy and caches by `(version, org, role)`.

**Precedence**

1. **Session provider** — When Studio passes an explicit `provider` (user toggle), `ai.router.completion_text` uses env + provider default map + `LLM_FALLBACK_MODELS` only (same as before). Policy rows do not override the model id in that case.
2. **Otherwise** — `structured_completion`, `completion_with_cost`, and `section_editor` pass `model_chain` built from the resolved route’s `primary_model` and `fallbacks`, then append env `LLM_FALLBACK_MODELS` entries (deduped). Route **temperature** applies in `structured_completion` and `section_editor`.

## Audit

`llm_routing_history` stores JSON snapshots of who changed what (write path from admin UI in a follow-up).

## Cost-aware & cold-start

Schema columns: `auto_route_cost_aware`, `cold_start_runs` on `llm_routing_policies` — used when auto-routing and quality metrics from `orchestration_runs` are connected (Phase 6 completion).

## Failover

`app/services/ai/router.py` tries models in order; on success after the first model, `record_fallback_metric` logs primary vs model used. Policy `fallbacks` JSONB lists `{ "provider", "model" }`; the **model** string is what LiteLLM receives (same as `primary_model`).
