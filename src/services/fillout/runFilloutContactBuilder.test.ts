/**
 * runFilloutContactBuilder.test.ts — Full sync offset paging (batches of 10).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactListItem } from '../../types/contact';
import type { ContactUpsertResult } from '../contactUpsert/contactUpsert';
import type { FilloutSubmission } from './mapFilloutShortTermToBundle';
import {
  FILLOUT_FULL_SYNC_BATCH_SIZE,
  runFilloutContactBuilderPages,
} from './filloutContactBuilderPages';

function makeSubs(count: number, offset: number): FilloutSubmission[] {
  return Array.from({ length: count }, (_, i) => {
    const n = offset + i + 1;
    return {
      submissionId: `sub-${n}`,
      submissionTime: `2026-01-${String(n).padStart(2, '0')}T12:00:00.000Z`,
      questions: [],
    };
  });
}

describe('runFilloutContactBuilderPages', () => {
  it('full sync pages 10/10/3 → 3 fetches and 23 processed', async () => {
    const pages = [
      makeSubs(10, 0),
      makeSubs(10, 10),
      makeSubs(3, 20),
    ];
    const fetchCalls: Array<{ offset: number; limit: number; sort: string }> =
      [];
    let pageIndex = 0;

    const created: ContactUpsertResult = {
      action: 'created',
      message: 'created',
    };

    const { summary } = await runFilloutContactBuilderPages({
      formId: 'form-test',
      full: true,
      limit: FILLOUT_FULL_SYNC_BATCH_SIZE,
      working: [] as ContactListItem[],
      processedIds: [],
      fetchPage: async ({ offset, limit, sort, afterDate }) => {
        fetchCalls.push({ offset, limit, sort });
        assert.equal(afterDate, undefined);
        assert.equal(limit, 10);
        assert.equal(sort, 'asc');
        const responses = pages[pageIndex] ?? [];
        pageIndex += 1;
        return { responses, totalResponses: 23 };
      },
      ingest: async () => [created],
    });

    assert.equal(fetchCalls.length, 3);
    assert.deepEqual(
      fetchCalls.map((c) => c.offset),
      [0, 10, 20],
    );
    assert.equal(summary.batches, 3);
    assert.equal(summary.scanned, 23);
    assert.equal(summary.created, 23);
  });
});
