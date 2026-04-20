# Context gathering (O-01)

## Orchestrator

`app/services/context/gather.py::gather_context` runs at the start of **Studio generate** (see `stream_page_generation` in `app/services/orchestration/pipeline.py`).

## Time budgets

- **Primary bundle (~3s):** brand kit, URL list, recent pages, org templates (stub), user voice prefs (JSON), calendar connection summary.
- **Secondary (~2s, if URLs present):** `extract_site_brand`, `extract_site_voice_stub`, `extract_site_products_stub`.

## Primitives

- `wait_with_budget` (`budget.py`) — `asyncio.wait` with timeout; cancels unfinished tasks.
- `with_timeout` — per-task ceiling.

## URL signals

- Regex scan of the prompt (`urls.py`).
- Else `org_settings.website_url` if set.
- Else weak heuristic: email domain → `https://{domain}` for non-consumer hosts.

## Site extraction

- **Brand:** `httpx` fetch + HTML meta (`site_extract.py`). Production should swap in Brand.dev / Firecrawl; results are **best-effort**, never blocking.
- **Voice / products:** lightweight stubs until dedicated LLM passes land.

## `ContextBundle`

- `ContextBundle.to_prompt_context()` is appended to the intent parser user message as **`context_block`** so the first draft respects gathered facts when available.

## SSE

Events emitted during generate (non-blocking for the client):

- `context` — `{ "phase": "started" }`
- `context.gathered` — duration, incomplete flags, URLs
- `context.brand.extracted` — when meta brand fields are found
- `context.voice.inferred` / `context.products.found` — when stubs return data

The web Studio can listen for these to show “Looking up …” chips (F-04).
