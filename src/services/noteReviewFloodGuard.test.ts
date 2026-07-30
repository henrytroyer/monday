import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  NOTE_REVIEW_FLOOD_THRESHOLD,
  clearFloodedInboxLocally,
  isNoteReviewFlooded,
  prunePendingOlderThanLookback,
} from './noteReviewFloodGuard';
import {
  clearPendingReviewQueue,
  getPendingReviewCount,
  upsertReviewItems,
} from './noteReviewStorage';
import type { NoteReviewItem } from '../types/noteReview';

const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

function makePending(id: string, createdAt: string): NoteReviewItem {
  return {
    id,
    boardId: 'b1',
    boardName: 'Board',
    itemId: 'i1',
    itemName: 'Item',
    body: 'note',
    createdAt,
    status: 'pending',
  };
}

describe('noteReviewFloodGuard', () => {
  beforeEach(() => {
    store.clear();
    clearPendingReviewQueue();
  });

  it('detects flood above threshold', () => {
    assert.equal(isNoteReviewFlooded(NOTE_REVIEW_FLOOD_THRESHOLD), false);
    assert.equal(isNoteReviewFlooded(NOTE_REVIEW_FLOOD_THRESHOLD + 1), true);
  });

  it('prunes pending notes older than lookback', () => {
    const old = new Date();
    old.setDate(old.getDate() - 90);
    const recent = new Date();
    recent.setDate(recent.getDate() - 2);

    upsertReviewItems([
      makePending('old-1', old.toISOString()),
      makePending('new-1', recent.toISOString()),
    ]);

    const removed = prunePendingOlderThanLookback();
    assert.equal(removed, 1);
    assert.equal(getPendingReviewCount(), 1);
  });

  it('clears flooded inbox locally and sets baseline', () => {
    const items = Array.from({ length: NOTE_REVIEW_FLOOD_THRESHOLD + 5 }, (_, i) =>
      makePending(`flood-${i}`, new Date().toISOString()),
    );
    upsertReviewItems(items);
    assert.equal(isNoteReviewFlooded(), true);

    const cleared = clearFloodedInboxLocally();
    assert.equal(cleared, NOTE_REVIEW_FLOOD_THRESHOLD + 5);
    assert.equal(getPendingReviewCount(), 0);
    assert.equal(isNoteReviewFlooded(), false);
  });
});
