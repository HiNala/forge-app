# Load testing (GL-03)

## k6

Scenarios live under `load/scenarios/`. See `load/README.md` for the Docker one-liner.

### Thresholds

Each scenario defines `thresholds` (p95 latency, error rate). Tune `BASE_URL`, `ORG_SLUG`, and `PAGE_SLUG` for real publishes before trusting numbers.

### CI

`.github/workflows/load-k6.yml` verifies the k6 Docker image; full runs should target **staging** with secrets for org/page slugs.

### Baselines

Committed numbers live in `docs/benchmarks/BASELINES.md` — update after each release when load tests are executed against a stable environment.
