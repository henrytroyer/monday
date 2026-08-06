#!/usr/bin/env bash
# run-merge-batches.sh — Finish contact cleanup in short live batches.
# Survives Cursor killing long-lived npm processes by keeping each batch small.
#
# Usage: bash scripts/run-merge-batches.sh

set -euo pipefail
cd "$(dirname "$0")/.."

LOG="${MERGE_BATCH_LOG:-/tmp/merge-contacts-batches.log}"
ROUND_LOG="${TMPDIR:-/tmp}/merge-contacts-round.log"
: >"$LOG"

export MERGE_REPORT_ONLY=false
export ALLOW_LIVE_MERGE=true
export FORCE_DIRECT_MONDAY=true
export VITE_MONDAY_API_PROXY_URL=
export MERGE_MAX_GROUP_SIZE="${MERGE_MAX_GROUP_SIZE:-100}"
# ~6–8 groups of 3 archives ≈ finishes under typical agent kill windows
export MERGE_MAX_ARCHIVE_PER_RUN="${MERGE_MAX_ARCHIVE_PER_RUN:-24}"
export VITE_CONTACTS_WRITABLE=true
export VITE_USE_MOCK_DATA=false
export VITE_MONDAY_READ_ONLY=false
export MERGE_SKIP_MUTE_CHECK="${MERGE_SKIP_MUTE_CHECK:-true}"

MAX_ROUNDS="${MERGE_BATCH_ROUNDS:-50}"
round=0
total_merged=0
total_archived=0

echo "[batches] logging to $LOG" | tee -a "$LOG"

while (( round < MAX_ROUNDS )); do
  round=$((round + 1))
  echo "" | tee -a "$LOG"
  echo "[batches] ===== round $round / $MAX_ROUNDS =====" | tee -a "$LOG"

  set +e
  npm run merge:contact-duplicates -- --override-high-volume >"$ROUND_LOG" 2>&1
  code=$?
  set -e
  cat "$ROUND_LOG" >>"$LOG"

  scanned=$(rg "Scanned " "$ROUND_LOG" | tail -1 || true)
  done_line=$(rg "Done\. Merged" "$ROUND_LOG" | tail -1 || true)
  echo "[batches] $scanned" | tee -a "$LOG"

  if [[ -n "$done_line" ]]; then
    echo "[batches] $done_line" | tee -a "$LOG"
    merged=$(echo "$done_line" | sed -n 's/.*Merged \([0-9]*\).*/\1/p')
    archived=$(echo "$done_line" | sed -n 's/.*archived \([0-9]*\).*/\1/p')
    total_merged=$((total_merged + ${merged:-0}))
    total_archived=$((total_archived + ${archived:-0}))
    if [[ "${merged:-0}" -eq 0 ]]; then
      echo "[batches] no more auto merges — cleanup complete" | tee -a "$LOG"
      echo "[batches] TOTAL merged=$total_merged archived=$total_archived" | tee -a "$LOG"
      exit 0
    fi
  else
    echo "[batches] round incomplete (exit $code)" | tee -a "$LOG"
    if rg -qi "timed? ?out|ECONNRESET|ETIMEDOUT" "$ROUND_LOG"; then
      echo "[batches] timeout — retrying after 5s" | tee -a "$LOG"
      sleep 5
      continue
    fi
    tail -n 30 "$ROUND_LOG" | tee -a "$LOG"
    exit "$code"
  fi

  sleep 2
done

echo "[batches] hit MAX_ROUNDS=$MAX_ROUNDS with remaining work" | tee -a "$LOG"
echo "[batches] TOTAL merged=$total_merged archived=$total_archived" | tee -a "$LOG"
exit 1
