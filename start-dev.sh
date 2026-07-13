#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

if [ -x "$ROOT/stop-dev.sh" ]; then
  "$ROOT/stop-dev.sh"
fi

cd "$BACKEND_DIR"
"$BACKEND_DIR/venv/bin/python" manage.py runserver 0.0.0.0:8000 > /tmp/closure-backend.log 2>&1 &
BACKEND_PID=$!

cd "$FRONTEND_DIR"
npm run dev > /tmp/closure-frontend.log 2>&1 &
FRONTEND_PID=$!

trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' EXIT

echo "Backend running at http://localhost:8000"
echo "Frontend running at http://localhost:3000"
wait "$BACKEND_PID" "$FRONTEND_PID"
