#!/usr/bin/env bash
set -euo pipefail

cleanup_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti tcp:"$port" | xargs -r kill -9 || true
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "$port"/tcp || true
  fi
}

cleanup_port 3000
cleanup_port 8001
