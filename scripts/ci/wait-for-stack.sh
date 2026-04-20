#!/usr/bin/env bash
# GL-03 — wait for docker-compose.ci services (API + web) before Playwright / k6.
set -euo pipefail

API_URL="${CI_API_HEALTH_URL:-http://127.0.0.1:8000/health/ready}"
WEB_URL="${CI_WEB_HEALTH_URL:-http://127.0.0.1:3000/}"

for i in $(seq 1 90); do
  if curl -sf "$API_URL" >/dev/null 2>&1 && curl -sf "$WEB_URL" >/dev/null 2>&1; then
    echo "Stack ready (attempt $i)"
    exit 0
  fi
  sleep 2
done

echo "Timeout waiting for $API_URL and $WEB_URL" >&2
exit 1
