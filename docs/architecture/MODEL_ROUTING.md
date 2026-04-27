# Model routing (production, V2 P-05)

## Sources of truth

1. **Code defaults** — `app/services/llm/llm_router.py` `ROUTES` (Mission O-01).
2. **Database** — `llm_routing_policies`  
   - `organization_id IS NULL` — platform defaults (partial unique index on `role`).  
   - `organization_id` set — per-org override (unique on `(organization_id, role)`).
3. **Cache invalidation** — `forge:llm_routing:version` Redis key, incremented by `bump_routing_version` on admin changes; optional `forge:llm_routing:invalidate` pub/sub for sub-second fan-out.

## Resolution

`effective_model_route(db, redis, role=..., organization_id=...)` in `routing_config_service.py` merges platform + org policy and caches by `(version, org, role)`. `structured_completion` uses the resolved `ModelRoute` for **temperature** (and future primary/fallback model selection in `ai.router` when wired end-to-end).

## Audit

`llm_routing_history` stores JSON snapshots of who changed what (write path from admin UI in a follow-up).

## Cost-aware & cold-start

Schema columns: `auto_route_cost_aware`, `cold_start_runs` on `llm_routing_policies` — used when auto-routing and quality metrics from `orchestration_runs` are connected (Phase 6 completion).

## Failover

Provider failover remains in `app/services/ai/router.py` (LiteLLM chain); policy `fallbacks` JSONB lists `{ "provider", "model" }` for future use when primary selection moves from env to policy rows.
