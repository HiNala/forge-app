#!/usr/bin/env bash
# Compare required keys from .env.example with Railway variables (GL-04 Phase 5).
# Usage:
#   ./scripts/deployment/audit_env.sh                    # list keys from .env.example
#   ./scripts/deployment/audit_env.sh staging            # same + try `railway variables`
#   ENV_FILE=.env.staging ./scripts/deployment/audit_env.sh staging
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env.example}"
ENV_NAME="${1:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env template: $ENV_FILE" >&2
  exit 1
fi

# Keys only — ignore comments and empty values
mapfile -t KEYS < <(grep -E '^[A-Z][A-Z0-9_]+=' "$ENV_FILE" | sed 's/=.*//' | sort -u)

echo "Source: $ENV_FILE"
echo "Variables: ${#KEYS[@]}"
if [[ -z "$ENV_NAME" ]]; then
  printf '%s\n' "${KEYS[@]}"
  exit 0
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found — install: https://docs.railway.com/develop/cli" >&2
  echo "Required keys from $ENV_FILE:" >&2
  printf '%s\n' "${KEYS[@]}" >&2
  exit 2
fi

echo "Railway environment: $ENV_NAME (set RAILWAY_TOKEN and run from a linked project directory)"
TMP="$(mktemp)"
# railway variables output format varies by CLI version — best-effort parse of KEY=
if railway variables --environment "$ENV_NAME" 2>/dev/null | tee "$TMP" | grep -qE '^[A-Z0-9_]+='; then
  :
else
  echo "Could not list variables (link project: \`railway link\`) or empty." >&2
  rm -f "$TMP"
  exit 3
fi

MISSING=0
for k in "${KEYS[@]}"; do
  if ! grep -E "^${k}=" "$TMP" >/dev/null 2>&1; then
    echo "MISSING in Railway: $k"
    MISSING=$((MISSING + 1))
  fi
done
rm -f "$TMP"

if [[ "$MISSING" -gt 0 ]]; then
  echo "Audit failed: $MISSING variables from $ENV_FILE not set in Railway ($ENV_NAME)." >&2
  exit 1
fi
echo "Audit OK: all ${#KEYS[@]} keys present in Railway ($ENV_NAME)."
