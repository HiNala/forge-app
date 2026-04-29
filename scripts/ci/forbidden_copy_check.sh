#!/usr/bin/env sh
# Forbidden copy guard (AL-04) — use from CI on Unix runners.
exec node "$(dirname "$0")/forbidden_copy_check.mjs"
