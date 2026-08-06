/**
 * privateContactNotes.test.ts — Merge + encrypt path for private hub notes.
 */

import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import type { ContactInternalNote } from '../types/contact';
import {
  addPrivateContactNote,
  fetchDecryptedPrivateContactNotes,
  mergeContactNotes,
} from './privateContactNotes';
import { configurePrivateNotesStore } from './privateNotesApi';
import {
  __resetPrivateNotesVaultForTests,
  setupPrivateNotesVault,
} from './privateNotesVault';

const OWNER = 'test-owner-uid';

function installLocalStorage(): void {
  if (typeof localStorage !== 'undefined') return;
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
      clear: () => {
        map.clear();
      },
    },
    configurable: true,
  });
}

describe('mergeContactNotes', () => {
  it('tags public notes and sorts by createdAt', () => {
    const publicNotes: ContactInternalNote[] = [
      {
        id: 'p2',
        body: 'later',
        createdAt: '2026-07-02T00:00:00.000Z',
        source: 'contact',
        sourceLabel: 'Contact',
        mondayItemId: 'm1',
      },
      {
        id: 'p1',
        body: 'earlier',
        createdAt: '2026-07-01T00:00:00.000Z',
        source: 'contact',
        sourceLabel: 'Contact',
        mondayItemId: 'm1',
      },
    ];
    const privateNotes: ContactInternalNote[] = [
      {
        id: 'priv',
        body: 'secret',
        createdAt: '2026-07-01T12:00:00.000Z',
        source: 'contact',
        sourceLabel: 'Contact',
        mondayItemId: '',
        visibility: 'private',
        ownerUid: OWNER,
      },
    ];
    const merged = mergeContactNotes(publicNotes, privateNotes);
    assert.deepEqual(
      merged.map((n) => n.id),
      ['p1', 'priv', 'p2'],
    );
    assert.equal(merged[0]?.visibility, 'public');
    assert.equal(merged[1]?.visibility, 'private');
  });
});

describe('addPrivateContactNote', () => {
  before(() => {
    installLocalStorage();
  });

  afterEach(() => {
    __resetPrivateNotesVaultForTests();
    localStorage.removeItem(`crm-private-notes-vault:${OWNER}`);
    localStorage.removeItem(`crm-private-notes-items:${OWNER}`);
    configurePrivateNotesStore({ baseUrl: null });
  });

  it('stores ciphertext only and decrypts for the unlocked owner', async () => {
    configurePrivateNotesStore({ baseUrl: null });
    const { recoveryKey } = await setupPrivateNotesVault(
      OWNER,
      'secure-passphrase',
    );
    assert.ok(recoveryKey.includes('-'));

    const note = await addPrivateContactNote({
      ownerUid: OWNER,
      contactId: 'contact-99',
      body: 'Do not sync to monday',
      target: { kind: 'contact', sourceLabel: 'Contact' },
      authorName: 'Tester',
    });

    assert.equal(note.visibility, 'private');
    assert.equal(note.body, 'Do not sync to monday');
    assert.equal(note.mondayItemId, '');

    const raw = localStorage.getItem(`crm-private-notes-items:${OWNER}`);
    assert.ok(raw);
    assert.equal(raw!.includes('Do not sync to monday'), false);
    assert.ok(raw!.includes('ciphertext'));

    const { notes, lockedCount } = await fetchDecryptedPrivateContactNotes(
      OWNER,
      'contact-99',
    );
    assert.equal(lockedCount, 0);
    assert.equal(notes.length, 1);
    assert.equal(notes[0]?.body, 'Do not sync to monday');
  });
});
