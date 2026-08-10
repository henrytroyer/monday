/**
 * filloutWatchState.test.ts — Seed cursor behavior for Node Fillout watcher.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  seedFilloutWatchStateIfEmpty,
  type FilloutWatchState,
} from './filloutWatchState';

describe('seedFilloutWatchStateIfEmpty', () => {
  it('seeds empty state to now without processing history', () => {
    const now = '2026-08-10T12:00:00.000Z';
    const empty: FilloutWatchState = { processedIds: [] };
    const seeded = seedFilloutWatchStateIfEmpty(empty, now);
    assert.equal(seeded.lastSubmissionTime, now);
    assert.equal(seeded.seeded, true);
    assert.deepEqual(seeded.processedIds, []);
  });

  it('does not overwrite an existing cursor', () => {
    const existing: FilloutWatchState = {
      lastSubmissionTime: '2026-08-01T00:00:00.000Z',
      processedIds: ['sub-1'],
      seeded: true,
    };
    const next = seedFilloutWatchStateIfEmpty(
      existing,
      '2026-08-10T12:00:00.000Z',
    );
    assert.equal(next.lastSubmissionTime, '2026-08-01T00:00:00.000Z');
    assert.deepEqual(next.processedIds, ['sub-1']);
  });
});
