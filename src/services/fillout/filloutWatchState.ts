/**
 * filloutWatchState.ts — Cursor shape + seed helper for the Node Fillout watcher.
 * File I/O lives in scripts/lib/filloutWatchStateFile.ts (Node-only).
 */

export interface FilloutWatchState {
  lastSubmissionTime?: string;
  processedIds: string[];
  /** ISO time of last successful watcher tick */
  lastRunAt?: string;
  /** True after first-run seed (empty state → now, no backfill) */
  seeded?: boolean;
}

/** First run with empty state: seed cursor to now so incremental ticks skip history. */
export function seedFilloutWatchStateIfEmpty(
  state: FilloutWatchState,
  nowIso = new Date().toISOString(),
): FilloutWatchState {
  if (state.lastSubmissionTime || state.seeded) return state;
  return {
    ...state,
    lastSubmissionTime: nowIso,
    seeded: true,
    lastRunAt: nowIso,
  };
}
