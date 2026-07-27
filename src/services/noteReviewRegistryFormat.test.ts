import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  encodeNoteReviewRegistryBody,
  parseNoteReviewRegistryEntry,
  parseNoteReviewRegistryUpdates,
} from './noteReviewRegistryFormat';

describe('noteReviewRegistryFormat', () => {
  it('round-trips approved registry entries', () => {
    const link = {
      noteKey: '1:2:3',
      contactId: '999',
      boardId: '1',
      boardName: 'Applications',
      itemId: '2',
      itemName: 'Jane Doe',
      body: 'Hello',
      createdAt: '2026-01-01T00:00:00.000Z',
      sourceLabel: 'Applications · Jane Doe',
      matchReason: 'email_exact',
    };
    const encoded = encodeNoteReviewRegistryBody({ action: 'approved', link });
    const parsed = parseNoteReviewRegistryEntry(encoded);
    assert.equal(parsed?.action, 'approved');
    if (parsed?.action === 'approved') {
      assert.deepEqual(parsed.link, link);
    }
  });

  it('round-trips dismissed registry entries', () => {
    const encoded = encodeNoteReviewRegistryBody({
      action: 'dismissed',
      noteKey: '1:2:3',
    });
    const parsed = parseNoteReviewRegistryEntry(encoded);
    assert.deepEqual(parsed, { action: 'dismissed', noteKey: '1:2:3' });
  });

  it('uses latest registry action per note key', () => {
    const approved = encodeNoteReviewRegistryBody({
      action: 'approved',
      link: {
        noteKey: '1:2:3',
        contactId: '999',
        boardId: '1',
        boardName: 'Applications',
        itemId: '2',
        itemName: 'Jane Doe',
        body: 'Hello',
        createdAt: '2026-01-01T00:00:00.000Z',
        sourceLabel: 'Applications',
        matchReason: 'manual_approve',
      },
    });
    const dismissed = encodeNoteReviewRegistryBody({
      action: 'dismissed',
      noteKey: '1:2:3',
    });

    const parsed = parseNoteReviewRegistryUpdates([
      { text_body: approved, created_at: '2026-01-01T00:00:00.000Z' },
      { text_body: dismissed, created_at: '2026-01-02T00:00:00.000Z' },
    ]);

    assert.equal(parsed.approved.length, 0);
    assert.deepEqual(parsed.dismissed, ['1:2:3']);
  });
});
