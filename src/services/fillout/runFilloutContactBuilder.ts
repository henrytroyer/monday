/**
 * runFilloutContactBuilder.ts — Pull ST Fillout submissions → ingestApplicationBundle.
 * Isolated from runContactIngest (Monday Sync). Full sync pages in batches of 10.
 */

import {
  resolveApplicationsBoardId,
  resolveContactsBoardId,
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
  fetchFilloutSubmissions,
  filloutShortTermFormId,
  probeFilloutProxyHealth,
} from './filloutApi';
import {
  FILLOUT_FULL_SYNC_BATCH_SIZE,
  runFilloutContactBuilderPages,
  type FilloutBatchProgress,
  type FilloutFetchPage,
} from './filloutContactBuilderPages';
import { mapFilloutShortTermToBundle } from './mapFilloutShortTermToBundle';

export {
  FILLOUT_FULL_SYNC_BATCH_SIZE,
  runFilloutContactBuilderPages,
  type FilloutBatchProgress,
} from './filloutContactBuilderPages';

const CURSOR_KEY = 'crm-fillout-st-cursor-v1';

interface FilloutCursor {
  lastSubmissionTime?: string;
  processedIds: string[];
}

export interface FilloutContactBuilderSummary {
  scanned: number;
  created: number;
  updated: number;
  queuedReview: number;
  skipped: number;
  errors: string[];
  pendingReviews: number;
  formId: string;
  batches: number;
}

function readCursor(): FilloutCursor {
  try {
    const raw = localStorage.getItem(CURSOR_KEY);
    if (!raw) return { processedIds: [] };
    const parsed = JSON.parse(raw) as FilloutCursor;
    return {
      lastSubmissionTime: parsed.lastSubmissionTime,
      processedIds: Array.isArray(parsed.processedIds)
        ? parsed.processedIds.slice(-500)
        : [],
    };
  } catch {
    return { processedIds: [] };
  }
}

function writeCursor(cursor: FilloutCursor): void {
  localStorage.setItem(
    CURSOR_KEY,
    JSON.stringify({
      lastSubmissionTime: cursor.lastSubmissionTime,
      processedIds: cursor.processedIds.slice(-500),
    }),
  );
}

export async function runFilloutContactBuilder(options?: {
  /** Full history backfill (paged). Default false = incremental since cursor. */
  full?: boolean;
  /** Page size (default 10 for full; 50 for incremental). */
  limit?: number;
  onBatch?: (progress: FilloutBatchProgress) => void;
  /** Test seam */
  fetchPage?: FilloutFetchPage;
}): Promise<FilloutContactBuilderSummary> {
  const formId = filloutShortTermFormId();
  const full = Boolean(options?.full);
  const limit =
    options?.limit ?? (full ? FILLOUT_FULL_SYNC_BATCH_SIZE : 50);
  const empty: FilloutContactBuilderSummary = {
    scanned: 0,
    created: 0,
    updated: 0,
    queuedReview: 0,
    skipped: 0,
    errors: [],
    pendingReviews: 0,
    formId,
    batches: 0,
  };

  if (readViteEnv('VITE_USE_MOCK_DATA') === 'true') {
    empty.errors.push('Fillout contact builder requires live Monday data.');
    return empty;
  }

  const health = await probeFilloutProxyHealth();
  if (!health.ok) {
    empty.errors.push(
      'Fillout proxy is not reachable. Run npm run fillout:proxy (or npm run dev:live).',
    );
    return empty;
  }
  if (!health.filloutConfigured) {
    empty.errors.push(
      'FILLOUT_API_KEY is not set on the Fillout proxy. Add it to .env and restart.',
    );
    return empty;
  }

  const cursor = readCursor();
  const contacts = await fetchContactsList({
    contactsBoardId: resolveContactsBoardId() ?? undefined,
    applicationsBoardId: resolveApplicationsBoardId(),
    longtermApplicationsBoardId: resolveLongtermApplicationsBoardId(),
    serviceEndedBoardId: resolveServiceEndedBoardId(),
    donationsBoardId: resolveDonationsBoardId(),
    refresh: true,
  });
  const working: ContactListItem[] = [...contacts];

  const fetchPage: FilloutFetchPage =
    options?.fetchPage ??
    (async ({ formId: id, afterDate, limit: pageLimit, offset, sort }) =>
      fetchFilloutSubmissions({
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
        processedIds: cursor.processedIds,
        lastSubmissionTime: cursor.lastSubmissionTime,
        ingest,
        onBatch: options?.onBatch,
      });

    writeCursor({
      lastSubmissionTime,
      processedIds,
    });

    return {
      ...summary,
      formId,
      pendingReviews: countPendingContactMatchReviews(),
    };
  } catch (error) {
    empty.errors.push(
      error instanceof Error ? error.message : String(error),
    );
    return empty;
  }
}
