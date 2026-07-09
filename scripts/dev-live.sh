#!/usr/bin/env bash
# Start Monday API proxy and Vite dev server together.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  if [[ -n "${PROXY_PID:-}" ]]; then
    kill "$PROXY_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting Monday API proxy (port 4042)..."
npm run monday:proxy &
PROXY_PID=$!

sleep 1

echo "Starting Vite dev server (port 4040)..."
echo "Open http://localhost:4040 when ready."
npm run dev
