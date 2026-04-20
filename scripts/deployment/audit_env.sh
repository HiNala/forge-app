#!/usr/bin/env bash
# GL-04 — compare `.env.example` keys with Railway variables for an environment.
# Usage: ./scripts/deployment/audit_env.sh staging|production
#
# Requires: Railway CLI (`npm i -g @railway/cli`) and `RAILWAY_TOKEN` in the environment.
# If the CLI is unavailable, prints the expected keys only (exit 0).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_NAME="${1:-}"

if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]]; then
  echo "Usage: $0 staging|production" >&2
  exit 2
fi

EXPECTED_FILE="$ROOT/.env.example"
if [[ ! -f "$EXPECTED_FILE" ]]; then
  echo "Missing $EXPECTED_FILE" >&2
  exit 1
fi

mapfile -t EXPECTED_KEYS < <(
  grep -E '^[A-Z][A-Z0-9_]*[[:space:]]*=' "$EXPECTED_FILE" 2>/dev/null \
    | cut -d= -f1 | tr -d ' ' | sort -u
)

echo "Expected $((${#EXPECTED_KEYS[@]})) keys from .env.example (environment: $ENV_NAME)"

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found — install: npm i -g @railway/cli" >&2
  echo "Expected keys:" >&2
  printf '  %s\n' "${EXPECTED_KEYS[@]}" >&2
  exit 0
fi

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "RAILWAY_TOKEN not set — cannot query Railway. Export token and re-run." >&2
  exit 0
fi

export RAILWAY_TOKEN
# Select target env (CLI varies; these patterns work on common Railway CLI versions).
railway environment use "$ENV_NAME" 2>/dev/null || true
export RAILWAY_ENVIRONMENT="$ENV_NAME"

# Railway CLI output format varies by version (often KEY=value lines; sometimes tables).
ACTUAL_RAW="$(railway variables 2>/dev/null || true)"
mapfile -t ACTUAL_KEYS < <(
  {
    echo "$ACTUAL_RAW" | grep -oE '^[A-Z][A-Z0-9_]+' || true
    echo "$ACTUAL_RAW" | grep -oE '^[[:space:]]*[A-Z][A-Z0-9_]+[[:space:]]*=' | sed 's/[[:space:]]//g' | cut -d= -f1 || true
  } | sort -u
)

if [[ ${#ACTUAL_KEYS[@]} -eq 0 ]]; then
  echo "Could not parse any variable names from 'railway variables' output." >&2
  echo "Link the project (railway link), select the environment, and ensure the CLI is current." >&2
  echo "Audit inconclusive (exit 0)." >&2
  exit 0
fi

missing=0
for key in "${EXPECTED_KEYS[@]}"; do
  found=0
  for ak in "${ACTUAL_KEYS[@]}"; do
    if [[ "$ak" == "$key" ]]; then
      found=1
      break
    fi
  done
  if [[ $found -eq 0 ]]; then
    echo "MISSING in Railway: $key"
    missing=1
  fi
done

if [[ $missing -eq 0 ]]; then
  echo "OK: every .env.example key appears in Railway ($ENV_NAME)."
  exit 0
fi
echo "Audit failed: add missing variables in Railway (environment: $ENV_NAME)." >&2
exit 1
