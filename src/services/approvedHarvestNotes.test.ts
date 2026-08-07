/**
 * approvedHarvestNotes.test.ts — Dedup approved harvest into Internal Notes.
 */

import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import { approvedNotesToContactInternalNotes } from './approvedHarvestNotes';
import type { ContactInternalNote } from '../types/contact';
import type { ApprovedNoteLink } from '../types/noteReview';

const APPROVED_KEY = 'crm-approved-note-links';

function ensureLocalStorage(): void {
  if (typeof localStorage !== 'undefined') return;
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
    configurable: true,
  });
}

before(() => {
  ensureLocalStorage();
});

function seedApproved(links: ApprovedNoteLink[]): void {
  localStorage.setItem(APPROVED_KEY, JSON.stringify(links));
}

afterEach(() => {
  localStorage.removeItem(APPROVED_KEY);
});

describe('approvedNotesToContactInternalNotes', () => {
  it('maps approved links for the contact', () => {
    seedApproved([
      {
        noteKey: 'board:item:u1',
        contactId: 'c1',
        boardId: 'b',
        boardName: 'Applications',
        itemId: 'i1',
        itemName: 'Ada Lovelace',
        body: 'Called pastor',
        createdAt: '2026-08-01T10:00:00.000Z',
        authorName: 'Shane',
        sourceLabel: 'Applications · Ada Lovelace',
        matchReason: 'name_item',
      },
      {
        noteKey: 'board:item:u2',
        contactId: 'c2',
        boardId: 'b',
        boardName: 'Applications',
        itemId: 'i2',
        itemName: 'Other',
        body: 'Wrong contact',
        createdAt: '2026-08-01T11:00:00.000Z',
        sourceLabel: 'Applications',
        matchReason: 'email',
      },
    ]);

    const notes = approvedNotesToContactInternalNotes('c1');
    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.id, 'approved:board:item:u1');
    assert.equal(notes[0]?.body, 'Called pastor');
    assert.equal(notes[0]?.sourceLabel, 'Applications · Ada Lovelace');
  });

  it('skips duplicates already present from CRM hub notes', () => {
    seedApproved([
      {
        noteKey: 'board:item:u1',
        contactId: 'c1',
        boardId: 'b',
        boardName: 'Applications',
        itemId: 'i1',
        itemName: 'Ada',
        body: 'Same text',
        createdAt: '2026-08-01T10:00:00.000Z',
        sourceLabel: 'Applications',
        matchReason: 'name_item',
      },
    ]);

    const existing: ContactInternalNote[] = [
      {
        id: 'monday-update-9',
        body: 'Same text',
        createdAt: '2026-08-01T10:00:00.000Z',
        source: 'contact',
        sourceLabel: 'Contact',
        mondayItemId: 'c1',
      },
    ];

    assert.equal(approvedNotesToContactInternalNotes('c1', existing).length, 0);
  });
});
