/**
 * filloutContactBuilderPages.ts — Offset paging for Fillout ST → Contacts.
 * Pure orchestration loop (inject fetchPage + ingest) for unit tests.
 */

import type { ContactListItem } from '../../types/contact';
import type { ContactUpsertResult } from '../contactUpsert/contactUpsert';
import type { FilloutSubmission } from './mapFilloutShortTermToBundle';

export const FILLOUT_FULL_SYNC_BATCH_SIZE = 10;

export interface FilloutBatchProgress {
  batchIndex: number;
  offset: number;
  batchSize: number;
  scannedTotal: number;
  created: number;
  updated: number;
}

export interface FilloutPagesSummary {
  scanned: number;
  created: number;
  updated: number;
  queuedReview: number;
  skipped: number;
  errors: string[];
  batches: number;
}

export type FilloutFetchPage = (options: {
  formId: string;
  afterDate?: string;
  limit: number;
  offset: number;
  sort: 'asc' | 'desc';
}) => Promise<{ responses: FilloutSubmission[]; totalResponses: number }>;

function tally(
  summary: FilloutPagesSummary,
  results: ContactUpsertResult[],
): void {
  for (const result of results) {
    if (result.action === 'created') summary.created += 1;
    else if (result.action === 'updated') summary.updated += 1;
    else if (result.action === 'queued_review') summary.queuedReview += 1;
    else summary.skipped += 1;
  }
}

function sortOldestFirst(responses: FilloutSubmission[]): FilloutSubmission[] {
  return [...responses].sort((a, b) => {
    const ta = a.submissionTime || '';
    const tb = b.submissionTime || '';
    return ta.localeCompare(tb);
  });
}

/**
 * Core paging loop — inject fetchPage/ingest for tests.
 */
export async function runFilloutContactBuilderPages(options: {
  formId: string;
  full: boolean;
  limit: number;
  fetchPage: FilloutFetchPage;
  working: ContactListItem[];
  processedIds: string[];
  lastSubmissionTime?: string;
  ingest: (
    submission: FilloutSubmission,
    working: ContactListItem[],
  ) => Promise<ContactUpsertResult[]>;
  onBatch?: (progress: FilloutBatchProgress) => void;
}): Promise<{
  summary: FilloutPagesSummary;
  processedIds: string[];
  lastSubmissionTime?: string;
}> {
  const summary: FilloutPagesSummary = {
    scanned: 0,
    created: 0,
    updated: 0,
    queuedReview: 0,
    skipped: 0,
    errors: [],
    batches: 0,
  };
  const processed = new Set(options.processedIds);
  let latestTime = options.lastSubmissionTime;
  let offset = 0;
  const limit = Math.max(1, options.limit);

  for (;;) {
    const page = await options.fetchPage({
      formId: options.formId,
      afterDate: options.full ? undefined : options.lastSubmissionTime,
      limit,
      offset,
      sort: options.full ? 'asc' : 'desc',
    });
    const responses = page.responses;
    if (responses.length === 0) break;

    summary.batches += 1;
    const ordered = sortOldestFirst(responses);

    for (const submission of ordered) {
      if (!submission.submissionId) continue;
      if (!options.full && processed.has(submission.submissionId)) {
        summary.skipped += 1;
        continue;
      }

      summary.scanned += 1;
      try {
        const results = await options.ingest(submission, options.working);
        tally(summary, results);
        processed.add(submission.submissionId);
        if (
          submission.submissionTime &&
          (!latestTime || submission.submissionTime > latestTime)
        ) {
          latestTime = submission.submissionTime;
        }
      } catch (error) {
        summary.errors.push(
          `${submission.submissionId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    options.onBatch?.({
      batchIndex: summary.batches,
      offset,
      batchSize: responses.length,
      scannedTotal: summary.scanned,
      created: summary.created,
      updated: summary.updated,
    });

    if (responses.length < limit) break;
    offset += limit;
  }

  return {
    summary,
    processedIds: [...processed],
    lastSubmissionTime: latestTime,
  };
}
