/**
 * eosReviewBoardWatcher.ts — Watch VS Exit Survey for new/changed reviews.
 * Invalidates the CRM EOS cache and notifies open contact details to refresh.
 */

import {
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  resolveEndOfServiceReviewBoardId,
  useMockData,
} from '../config/boards';
import { clearEndOfServiceReviewLiveCache } from './contactsApi';
import { mondayGraphQL as api } from './mondayGraphQL';

const registeredContactIds = new Set<string>();
let lastFingerprint: string | null = null;

export function registerWatchedContactForEosReviews(contactId: string): void {
  if (contactId && !contactId.startsWith('compiled:')) {
    registeredContactIds.add(contactId);
  }
}

export function unregisterWatchedContactForEosReviews(contactId: string): void {
  registeredContactIds.delete(contactId);
}

export function notifyEosReviewsChanged(contactIds: string[] = []): void {
  window.dispatchEvent(
    new CustomEvent('crm-eos-reviews-changed', {
      detail: { contactIds },
    }),
  );
}

export function eosReviewWatchIsEnabled(): boolean {
  return !useMockData() && Boolean(resolveEndOfServiceReviewBoardId());
}

export function eosReviewWatchIntervalMs(): number {
  return mondayWatchIntervalMs();
}

async function readBoardFingerprint(boardId: string): Promise<string> {
  type Response = {
    boards: Array<{
      items_count: number;
      items_page: { items: Array<{ id: string; created_at?: string }> };
    }>;
  };

  const data = await api<Response>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_count
        items_page(limit: 10) {
          items { id created_at }
        }
      }
    }`,
    { boardId: [boardId] },
  );

  const board = data.boards?.[0];
  if (!board) return '';
  const recent = (board.items_page?.items ?? [])
    .map((item) => `${item.id}:${item.created_at ?? ''}`)
    .join('|');
  return `${board.items_count}|${recent}`;
}

/**
 * Poll VS Exit Survey. When the board fingerprint changes, clear the CRM
 * cache and notify registered (open) contacts — or all listeners if none.
 */
export async function pollEosReviewBoardUpdates(): Promise<string[]> {
  if (!eosReviewWatchIsEnabled()) return [];

  // Always poll when contacts are open; otherwise only with global watch on.
  if (registeredContactIds.size === 0 && !isMondayWatchEnabled()) {
    return [];
  }

  const boardId = resolveEndOfServiceReviewBoardId();
  if (!boardId) return [];

  try {
    const fingerprint = await readBoardFingerprint(boardId);
    if (!fingerprint) return [];
    if (lastFingerprint === fingerprint) return [];

    const isFirst = lastFingerprint === null;
    lastFingerprint = fingerprint;
    if (isFirst) return [];

    clearEndOfServiceReviewLiveCache();
    const contactIds = [...registeredContactIds];
    notifyEosReviewsChanged(contactIds);
    return contactIds;
  } catch {
    return [];
  }
}

/** Test helper */
export function resetEosReviewWatcherStateForTests(): void {
  lastFingerprint = null;
  registeredContactIds.clear();
}
