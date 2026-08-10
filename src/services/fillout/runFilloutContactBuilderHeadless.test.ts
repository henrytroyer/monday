/**
 * runFilloutContactBuilderHeadless.test.ts — Seed-only first tick + mocked page ingest.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactListItem } from '../../types/contact';
import type { ContactUpsertResult } from '../contactUpsert/contactUpsert';
import type { FilloutSubmission } from './mapFilloutShortTermToBundle';
import { runFilloutContactBuilderPages } from './filloutContactBuilderPages';
import { seedFilloutWatchStateIfEmpty } from './filloutWatchState';

describe('fillout watcher headless paging (mocked)', () => {
  it('incremental after seeded cursor processes new page only', async () => {
    const seeded = seedFilloutWatchStateIfEmpty(
      { processedIds: [] },
      '2026-08-10T00:00:00.000Z',
    );
    assert.equal(seeded.lastSubmissionTime, '2026-08-10T00:00:00.000Z');

    const created: ContactUpsertResult = {
      action: 'created',
      message: 'created',
    };
    const page: FilloutSubmission[] = [
      {
        submissionId: 'sub-new-1',
        submissionTime: '2026-08-10T01:00:00.000Z',
        questions: [],
      },
      {
        submissionId: 'sub-new-2',
        submissionTime: '2026-08-10T02:00:00.000Z',
        questions: [],
      },
    ];

    let afterDateSeen: string | undefined;
    const { summary, lastSubmissionTime, processedIds } =
      await runFilloutContactBuilderPages({
        formId: 'form-test',
        full: false,
        limit: 50,
        working: [] as ContactListItem[],
        processedIds: seeded.processedIds,
        lastSubmissionTime: seeded.lastSubmissionTime,
        fetchPage: async ({ afterDate, sort }) => {
          afterDateSeen = afterDate;
          assert.equal(sort, 'desc');
          return { responses: page, totalResponses: 2 };
        },
        ingest: async () => [created],
      });

    assert.equal(afterDateSeen, '2026-08-10T00:00:00.000Z');
    assert.equal(summary.scanned, 2);
    assert.equal(summary.created, 2);
    assert.equal(lastSubmissionTime, '2026-08-10T02:00:00.000Z');
    assert.equal(processedIds.length, 2);
  });
});
