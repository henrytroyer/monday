#!/usr/bin/env bash
# Start Monday API proxy, private-notes store, and Vite together.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROXY_PID=""
PRIVATE_NOTES_PID=""

cleanup() {
  if [[ -n "${PROXY_PID:-}" ]]; then
    kill "$PROXY_PID" 2>/dev/null || true
  fi
  if [[ -n "${PRIVATE_NOTES_PID:-}" ]]; then
    kill "$PRIVATE_NOTES_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if command -v lsof >/dev/null 2>&1; then
  lsof -ti:4042 | xargs kill -9 2>/dev/null || true
  lsof -ti:4043 | xargs kill -9 2>/dev/null || true
fi

echo "Starting Monday API proxy (port 4042)..."
npm run monday:proxy &
PROXY_PID=$!

echo "Starting private-notes proxy (port 4043)..."
npm run private-notes:proxy &
PRIVATE_NOTES_PID=$!

sleep 1

echo "Starting Vite dev server (port 4040)..."
echo "Open http://localhost:4040 when ready."
if [[ -z "${VITE_PRIVATE_NOTES_URL:-}" ]]; then
  # Prefer .env when present; otherwise default so sync works out of the box.
  if ! grep -q '^VITE_PRIVATE_NOTES_URL=' .env 2>/dev/null; then
    export VITE_PRIVATE_NOTES_URL=/api/private-notes
    echo "VITE_PRIVATE_NOTES_URL not set — using /api/private-notes for this session."
  fi
fi
npm run dev
