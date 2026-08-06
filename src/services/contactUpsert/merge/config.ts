/**
 * config.ts — Operational limits for contact merge runs.
 */

import {
  DEFAULT_MERGE_OPS_CONFIG,
  type MergeOpsConfig,
} from './types';

function intEnv(key: string, fallback: number): number {
  const raw = processEnv(key);
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = processEnv(key);
  if (raw == null) return fallback;
  return raw === 'true' || raw === '1';
}

function processEnv(key: string): string | undefined {
  try {
    if (typeof process !== 'undefined' && process.env?.[key] != null) {
      return String(process.env[key]).trim();
    }
  } catch {
    // ignore
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const value = import.meta.env[key];
      return typeof value === 'string' ? value.trim() : undefined;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function loadMergeOpsConfig(
  overrides: Partial<MergeOpsConfig> = {},
): MergeOpsConfig {
  return {
    maxGroupSize: overrides.maxGroupSize ??
      intEnv('MERGE_MAX_GROUP_SIZE', DEFAULT_MERGE_OPS_CONFIG.maxGroupSize),
    maxArchivePerRun: overrides.maxArchivePerRun ??
      intEnv(
        'MERGE_MAX_ARCHIVE_PER_RUN',
        DEFAULT_MERGE_OPS_CONFIG.maxArchivePerRun,
      ),
    highVolumeThreshold: overrides.highVolumeThreshold ??
      intEnv(
        'MERGE_HIGH_VOLUME_THRESHOLD',
        DEFAULT_MERGE_OPS_CONFIG.highVolumeThreshold,
      ),
    reportOnly: overrides.reportOnly ??
      boolEnv('MERGE_REPORT_ONLY', DEFAULT_MERGE_OPS_CONFIG.reportOnly),
    batchDelayMs: overrides.batchDelayMs ??
      intEnv('MERGE_BATCH_DELAY_MS', DEFAULT_MERGE_OPS_CONFIG.batchDelayMs),
    maxRetries: overrides.maxRetries ??
      intEnv('MERGE_MAX_RETRIES', DEFAULT_MERGE_OPS_CONFIG.maxRetries),
  };
}
