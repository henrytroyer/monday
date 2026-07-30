/**
 * safeguardingWrite.ts — Write safeguarding certificate links / notes to Monday.
 */

import {
  canEditSafeguarding,
  resolveApplicationsBoardId,
  useMockData,
} from '../config/boards';
import { columnMap } from '../config/columnMap';
import { mutations } from '../utils/mondayQueries';
import { tryChangeColumnByTitle } from './mondayColumnWrite';
import { mondayGraphQL as api } from './mondayGraphQL';
import { invalidateApplicationDetail } from './sessionDetailCache';

/** Record that a safeguarding certificate was received (mirror column + update). */
export async function markSafeguardingReceivedOnApplication(
  itemId: string,
  options?: { boardId?: string; note?: string; receivedDate?: string },
): Promise<void> {
  if (useMockData()) return;
  if (!canEditSafeguarding() && !canEditApplicationsSafe()) {
    throw new Error('Safeguarding is read-only: cannot update Monday.');
  }

  const boardId =
    options?.boardId ?? resolveApplicationsBoardId() ?? undefined;
  if (!boardId) {
    throw new Error('Applications board is not configured.');
  }

  const date =
    options?.receivedDate ?? new Date().toISOString().slice(0, 10);
  await tryChangeColumnByTitle(
    boardId,
    itemId,
    columnMap.safeguardingMirror,
    date,
  );

  const body =
    options?.note?.trim() ||
    `CRM_SAFEGUARDING|received|${date}`;
  await api(mutations.createUpdate, { itemId, body });
  invalidateApplicationDetail(itemId);
}

function canEditApplicationsSafe(): boolean {
  try {
    // Lazy import pattern avoided — use env directly to prevent cycles.
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') return true;
    if (import.meta.env.VITE_APPLICATIONS_WRITABLE === 'true') return true;
    return import.meta.env.VITE_MONDAY_READ_ONLY !== 'true';
  } catch {
    return false;
  }
}
