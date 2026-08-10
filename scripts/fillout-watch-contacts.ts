/**
 * fillout-watch-contacts.ts — Poll short-term Fillout → contact builder (Node).
 *
 * Usage:
 *   npm run fillout:watch
 *   npm run fillout:sync-once
 *   npm run fillout:sync-once -- --full
 *
 * Env: FILLOUT_API_KEY, MONDAY_API_TOKEN, FILLOUT_WATCH_* (see .env.example)
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installFileLocalStorage } from './lib/installFileLocalStorage.ts';
import {
  FILLOUT_FULL_SYNC_BATCH_SIZE,
} from '../src/services/fillout/filloutContactBuilderPages.ts';
import { filloutApiKey } from '../src/services/fillout/filloutDirectApi.ts';
import {
  loadFilloutWatchState,
  resolveFilloutWatchStatePath,
  saveFilloutWatchState,
} from './lib/filloutWatchStateFile.ts';
import { runFilloutContactBuilderHeadless } from '../src/services/fillout/runFilloutContactBuilderHeadless.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function sanitizeEnvVar(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/^["']|["']$/g, '').replace(/\n|\r/g, '');
}

function log(
  level: 'log' | 'warn' | 'error',
  message: string,
  extra?: unknown,
): void {
  const line = `[fillout-watch] ${message}`;
  if (extra !== undefined) console[level](line, extra);
  else console[level](line);
}

function parseIntervalMs(): number {
  const raw = Number(process.env.FILLOUT_WATCH_INTERVAL_MS || 60_000);
  if (!Number.isFinite(raw)) return 60_000;
  return Math.max(15_000, raw);
}

async function main(): Promise<void> {
  const enabled = process.env.FILLOUT_WATCH_ENABLED !== 'false';
  if (!enabled) {
    log('log', 'FILLOUT_WATCH_ENABLED=false — exiting');
    process.exit(0);
  }

  const mondayApiToken = sanitizeEnvVar(process.env.MONDAY_API_TOKEN);
  if (mondayApiToken) process.env.MONDAY_API_TOKEN = mondayApiToken;
  if (!mondayApiToken) {
    throw new Error('Set MONDAY_API_TOKEN in environment');
  }
  if (!filloutApiKey()) {
    throw new Error('Set FILLOUT_API_KEY in environment');
  }

  process.env.FORCE_DIRECT_MONDAY = 'true';
  process.env.VITE_USE_MOCK_DATA = 'false';
  process.env.VITE_CONTACTS_WRITABLE =
    process.env.VITE_CONTACTS_WRITABLE || 'true';
  process.env.VITE_MONDAY_READ_ONLY = 'false';
  // Prefer direct Monday GraphQL (see mondayGraphQL.resolveProxyBase).
  if (!process.env.VITE_MONDAY_API_PROXY_URL) {
    process.env.VITE_MONDAY_API_PROXY_URL = '';
  }

  const statePath = resolveFilloutWatchStatePath();
  const localStoragePath = resolve(
    root,
    'server/.fillout-watch-localStorage.json',
  );
  installFileLocalStorage(localStoragePath);

  const once = process.argv.includes('--once');
  const full = process.argv.includes('--full');
  const intervalMs = parseIntervalMs();

  log(
    'log',
    `Starting (interval ${intervalMs}ms, state ${statePath}${full ? ', full' : ', incremental'})`,
  );

  const runTick = async () => {
    const state = loadFilloutWatchState(statePath);
    const { summary, state: next } = await runFilloutContactBuilderHeadless({
      full,
      limit: full ? FILLOUT_FULL_SYNC_BATCH_SIZE : 50,
      state,
      seedEmptyToNow: !full,
      onBatch: (batch) => {
        log(
          'log',
          `batch ${batch.batchIndex} offset=${batch.offset} scanned=${batch.scannedTotal} created=${batch.created} updated=${batch.updated}`,
        );
      },
    });
    saveFilloutWatchState(statePath, next);

    if (summary.seededOnly) {
      log(
        'log',
        `Seeded cursor to ${next.lastSubmissionTime} (no historical backfill). Use --full for backfill.`,
      );
      return summary;
    }

    log('log', 'Tick complete', {
      scanned: summary.scanned,
      created: summary.created,
      updated: summary.updated,
      queuedReview: summary.queuedReview,
      skipped: summary.skipped,
      batches: summary.batches,
      errors: summary.errors.length,
    });
    if (summary.errors.length) {
      for (const err of summary.errors.slice(0, 5)) {
        log('warn', err);
      }
    }
    return summary;
  };

  try {
    await runTick();
  } catch (err) {
    log(
      'error',
      `Run failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }

  if (once || full) {
    process.exit(0);
  }

  setInterval(() => {
    void runTick().catch((err) => {
      log(
        'error',
        `Run failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }, intervalMs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
