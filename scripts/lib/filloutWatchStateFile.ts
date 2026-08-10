/**
 * filloutWatchStateFile.ts — Persist Fillout watcher cursor under server/.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FilloutWatchState } from '../../src/services/fillout/filloutWatchState.ts';

const DEFAULT_RELATIVE = 'server/.fillout-st-sync-state.json';
const MAX_PROCESSED = 2000;

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../..');
}

export function resolveFilloutWatchStatePath(override?: string): string {
  const fromEnv =
    override?.trim() ||
    process.env.FILLOUT_WATCH_STATE_PATH?.trim() ||
    '';
  if (fromEnv) {
    return resolve(fromEnv);
  }
  return resolve(repoRoot(), DEFAULT_RELATIVE);
}

export function loadFilloutWatchState(path: string): FilloutWatchState {
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as FilloutWatchState;
    return {
      lastSubmissionTime: parsed.lastSubmissionTime,
      processedIds: Array.isArray(parsed.processedIds)
        ? parsed.processedIds.slice(-MAX_PROCESSED)
        : [],
      lastRunAt: parsed.lastRunAt,
      seeded: Boolean(parsed.seeded),
    };
  } catch {
    return { processedIds: [] };
  }
}

export function saveFilloutWatchState(
  path: string,
  state: FilloutWatchState,
): void {
  mkdirSync(dirname(path), { recursive: true });
  const next: FilloutWatchState = {
    lastSubmissionTime: state.lastSubmissionTime,
    processedIds: (state.processedIds ?? []).slice(-MAX_PROCESSED),
    lastRunAt: state.lastRunAt,
    seeded: state.seeded,
  };
  writeFileSync(path, JSON.stringify(next, null, 2) + '\n', 'utf8');
}
