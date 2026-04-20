# Clarify flow (non-blocking)

## Principle

Forge **always ships a first draft** before asking for clarification. When the intent parser is uncertain, we still pick a primary workflow and continue the pipeline.

## Confidence thresholds

| Confidence | Behavior |
|------------|----------|
| ≥ 0.85 | No clarify UI; primary workflow only |
| 0.65–0.85 | SSE `clarify` with top candidates; pipeline continues |
| &lt; 0.65 | Same SSE, more prominent in the UI; still continues |

## SSE

`clarify` payload: `{ "candidates": [ { "workflow", "confidence" }, ... ] }` built from the primary intent plus `PageIntent.alternatives`.

## Continue endpoint

`POST /api/v1/studio/generate/continue` is reserved for F-04 session wiring. It currently returns **501** with guidance to use **refine** or **regenerate** until session state stores the in-flight graph run.

## Frontend (F-04)

The Studio client should render switchable chips from `clarify` without blocking the streaming compose events. If the user does nothing for ~8 seconds, the draft already exists; they can refine in chat.
