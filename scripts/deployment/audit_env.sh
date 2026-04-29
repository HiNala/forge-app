#!/usr/bin/env bash
# GL-04 / AL-01 — compare `.env.example` keys with Railway variables for an environment.
# Usage: ./scripts/deployment/audit_env.sh staging|production [--strict]
#
# Requires: Railway CLI (`npm i -g @railway/cli`) and `RAILWAY_TOKEN` in the environment.
#
# Modes:
#   Default: best-effort; exits 0 if CLI/token missing or output is inconclusive (local dev-friendly).
#   --strict OR AUDIT_ENV_STRICT=1: fail closed — missing CLI/token/unparseable output → non-zero exit.
#
# Optional: AUDIT_EXPECT_RAILWAY_LINK=1 in strict CI — warns if Railway project/env is unlinked (CLI still exits 1 on missing keys).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_NAME=""
STRICT=0

for arg in "$@"; do
  case "$arg" in
    staging|production) ENV_NAME="$arg" ;;
    --strict) STRICT=1 ;;
  esac
done

if [[ -n "${AUDIT_ENV_STRICT:-}" ]] && [[ "$AUDIT_ENV_STRICT" =~ ^(1|true|yes)$ ]]; then
  STRICT=1
fi

if [[ "$ENV_NAME" != "staging" && "$ENV_NAME" != "production" ]]; then
  echo "Usage: $0 staging|production [--strict]" >&2
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

echo "Expected $((${#EXPECTED_KEYS[@]})) keys from .env.example (environment: $ENV_NAME, strict=$STRICT)"

fail_strict() {
  echo "$*" >&2
  if [[ "$STRICT" -eq 1 ]]; then
    exit 1
  fi
}

if ! command -v railway >/dev/null 2>&1; then
  fail_strict "railway CLI not found — install: npm i -g @railway/cli"
  echo "Expected keys:" >&2
  printf '  %s\n' "${EXPECTED_KEYS[@]}" >&2
  exit 0
fi

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  fail_strict "RAILWAY_TOKEN not set — cannot query Railway."
  echo "Export RAILWAY_TOKEN and re-run." >&2
  exit 0
fi

export RAILWAY_TOKEN
railway environment use "$ENV_NAME" 2>/dev/null || true
export RAILWAY_ENVIRONMENT="$ENV_NAME"

ACTUAL_RAW=""
ACTUAL_JSON=""
ACTUAL_KEYS=()

if ACTUAL_JSON="$(railway variables --json 2>/dev/null)" && [[ -n "$ACTUAL_JSON" ]]; then
  if command -v jq >/dev/null 2>&1; then
    mapfile -t ACTUAL_KEYS < <(echo "$ACTUAL_JSON" | jq -r 'keys[]?' 2>/dev/null | sort -u || true)
  fi
fi

if [[ ${#ACTUAL_KEYS[@]} -eq 0 ]]; then
  ACTUAL_RAW="$(railway variables 2>/dev/null || true)"
  mapfile -t ACTUAL_KEYS < <(
    {
      echo "$ACTUAL_RAW" | grep -oE '^[A-Z][A-Z0-9_]+' || true
      echo "$ACTUAL_RAW" | grep -oE '^[[:space:]]*[A-Z][A-Z0-9_]+[[:space:]]*=' | sed 's/[[:space:]]//g' | cut -d= -f1 || true
    } | sort -u
  )
fi

if [[ ${#ACTUAL_KEYS[@]} -eq 0 ]]; then
  fail_strict "Could not parse any variable names from 'railway variables' (try 'railway link', update CLI). Audit inconclusive."
  exit 0
fi

_placeholder_vals='^(changeme|change-me|YOUR_|your-|REPLACE|placeholder|\s*)$'

missing=0
bad_placeholder=0
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

# Best-effort: if we have jq + JSON blob, reject obvious placeholders for critical secrets in production audits.
if [[ "$ENV_NAME" == "production" && "$STRICT" -eq 1 ]] && command -v jq >/dev/null 2>&1 && [[ -n "${ACTUAL_JSON:-}" ]]; then
  while IFS= read -r pname; do
    raw="$(echo "$ACTUAL_JSON" | jq -r --arg k "$pname" '.[$k] // empty' 2>/dev/null || true)"
    val="${raw#*=}"
    if [[ -z "$val" ]]; then
      echo "EMPTY value in Railway (production strict): $pname" >&2
      bad_placeholder=1
    elif [[ "$pname" =~ (SECRET|TOKEN|PASSWORD|KEY|WEBHOOK) ]] && echo "$val" | grep -qE "$_placeholder_vals"; then
      echo "PLACEHOLDER-like value in Railway for $pname (production strict)." >&2
      bad_placeholder=1
    fi
  done < <(printf '%s\n' "${EXPECTED_KEYS[@]}")
fi

if [[ $missing -eq 0 && $bad_placeholder -eq 0 ]]; then
  echo "OK: every .env.example key appears in Railway ($ENV_NAME)."
  exit 0
fi

echo "Audit failed: fix Railway variables (environment: $ENV_NAME)." >&2
exit 1
