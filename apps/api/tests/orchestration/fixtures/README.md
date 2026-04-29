Eval fixtures are JSON objects with at least:

- `prompt` — user text
- `expected_workflow_contains` — optional substring matched against heuristic intent (smoke tests)

CI-safe tests avoid live LLMs; full 50-fixture gated eval belongs in nightly jobs once keys are wired.
