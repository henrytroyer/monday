/**
 * runFilloutContactBuilderHeadless.ts — Node Fillout → Contacts (file state + direct API).
 * Used by scripts/fillout-watch-contacts.ts. Browser UI keeps runFilloutContactBuilder.
 */

import {
  resolveApplicationsBoardId,
  resolveDonationsBoardId,
  resolveLongtermApplicationsBoardId,
  resolveServiceEndedBoardId,
} from '../../config/boards';
import type { ContactListItem } from '../../types/contact';
import { readViteEnv } from '../../utils/readViteEnv';
import { fetchContactsList } from '../contactsApi';
import { countPendingContactMatchReviews } from '../contactUpsert/contactMatchReviewStorage';
import { ingestApplicationBundle } from '../contactUpsert/ingestApplicationBundle';
import type { ContactUpsertResult } from '../contactUpsert/contactUpsert';
import {
  fetchFilloutSubmissionsDirect,
  filloutShortTermFormIdDirect,
} from './filloutDirectApi';
import {
  FILLOUT_FULL_SYNC_BATCH_SIZE,
  runFilloutContactBuilderPages,
  type FilloutBatchProgress,
  type FilloutFetchPage,
} from './filloutContactBuilderPages';
import type { FilloutWatchState } from './filloutWatchState';
import { seedFilloutWatchStateIfEmpty } from './filloutWatchState';
import { mapFilloutShortTermToBundle } from './mapFilloutShortTermToBundle';

export interface FilloutHeadlessSummary {
  scanned: number;
  created: number;
  updated: number;
  queuedReview: number;
  skipped: number;
  errors: string[];
  pendingReviews: number;
  formId: string;
  batches: number;
  seededOnly: boolean;
}

export async function runFilloutContactBuilderHeadless(options: {
  full?: boolean;
  limit?: number;
  state: FilloutWatchState;
  onBatch?: (progress: FilloutBatchProgress) => void;
  fetchPage?: FilloutFetchPage;
  /** When true (default), empty state seeds to now and skips ingest. */
  seedEmptyToNow?: boolean;
}): Promise<{
  summary: FilloutHeadlessSummary;
  state: FilloutWatchState;
}> {
  const formId = filloutShortTermFormIdDirect();
  const full = Boolean(options.full);
  const limit =
    options.limit ?? (full ? FILLOUT_FULL_SYNC_BATCH_SIZE : 50);
  const empty: FilloutHeadlessSummary = {
    scanned: 0,
    created: 0,
    updated: 0,
    queuedReview: 0,
    skipped: 0,
    errors: [],
    pendingReviews: 0,
    formId,
    batches: 0,
    seededOnly: false,
  };

  if (readViteEnv('VITE_USE_MOCK_DATA') === 'true') {
    empty.errors.push('Fillout watcher requires live Monday data (VITE_USE_MOCK_DATA=false).');
    return { summary: empty, state: options.state };
  }

  let state = { ...options.state, processedIds: [...options.state.processedIds] };

  // Incremental first run: seed cursor to now — no historical backfill.
  if (!full && (options.seedEmptyToNow ?? true)) {
    const before = state.lastSubmissionTime;
    state = seedFilloutWatchStateIfEmpty(state);
    if (!before && state.seeded) {
      return {
        summary: { ...empty, seededOnly: true },
        state: {
          ...state,
          lastRunAt: new Date().toISOString(),
        },
      };
    }
  }

  const contacts = await fetchContactsList({
    applicationsBoardId: resolveApplicationsBoardId(),
    longtermApplicationsBoardId: resolveLongtermApplicationsBoardId(),
    serviceEndedBoardId: resolveServiceEndedBoardId(),
    donationsBoardId: resolveDonationsBoardId(),
    refresh: true,
  });
  const working: ContactListItem[] = [...contacts];

  const fetchPage: FilloutFetchPage =
    options.fetchPage ??
    (async ({ formId: id, afterDate, limit: pageLimit, offset, sort }) =>
      fetchFilloutSubmissionsDirect({
        formId: id,
        afterDate,
        limit: pageLimit,
        offset,
        sort,
      }));

  const ingest = async (
    submission: Parameters<typeof mapFilloutShortTermToBundle>[0],
    workingList: ContactListItem[],
  ): Promise<ContactUpsertResult[]> => {
    const bundle = mapFilloutShortTermToBundle(submission);
    const result = await ingestApplicationBundle(bundle, workingList);
    return result.results;
  };

  try {
    const { summary, processedIds, lastSubmissionTime } =
      await runFilloutContactBuilderPages({
        formId,
        full,
        limit,
        fetchPage,
        working,
        processedIds: state.processedIds,
        lastSubmissionTime: full ? undefined : state.lastSubmissionTime,
        ingest,
        onBatch: options.onBatch,
      });

    const nextState: FilloutWatchState = {
      lastSubmissionTime: lastSubmissionTime ?? state.lastSubmissionTime,
      processedIds,
      lastRunAt: new Date().toISOString(),
      seeded: true,
    };

    let pendingReviews = 0;
    try {
      pendingReviews = countPendingContactMatchReviews();
    } catch {
      pendingReviews = summary.queuedReview;
    }

    return {
      summary: {
        ...summary,
        formId,
        pendingReviews,
        seededOnly: false,
      },
      state: nextState,
    };
  } catch (error) {
    empty.errors.push(
      error instanceof Error ? error.message : String(error),
    );
    return {
      summary: empty,
      state: {
        ...state,
        lastRunAt: new Date().toISOString(),
      },
    };
  }
}
