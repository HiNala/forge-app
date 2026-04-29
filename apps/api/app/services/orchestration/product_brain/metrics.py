"""Prometheus instrumentation for BP-01 orchestration."""

from __future__ import annotations

try:
    from prometheus_client import Counter, Histogram

    _CALLS = Counter(
        "forge_agent_call_total",
        "Completed BP-01 agent node invocations.",
        ["agent", "status"],
    )
    _LAT = Histogram(
        "forge_agent_call_duration_ms",
        "Agent wall time (ms)",
        ["agent"],
        buckets=(50, 100, 250, 500, 1000, 3000, 8000),
    )

    def observe_agent(agent: str, *, ok: bool) -> None:
        _CALLS.labels(agent=agent, status="ok" if ok else "error").inc()

    def observe_latency_ms(agent: str, ms: float) -> None:
        _LAT.labels(agent=agent).observe(ms)

except ImportError:

    def observe_agent(agent: str, *, ok: bool) -> None:  # noqa: ARG001
        return

    def observe_latency_ms(agent: str, ms: float) -> None:  # noqa: ARG001
        return
