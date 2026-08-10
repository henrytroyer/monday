/**
 * privateContactNotes.test.ts — Org private notes merge + local store path.
 */

import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import type { ContactInternalNote } from '../types/contact';
import {
  addPrivateContactNote,
  fetchDecryptedPrivateContactNotes,
  mergeContactNotes,
} from './privateContactNotes';
import {
  configurePrivateNotesStore,
  createPrivateNoteEnvelope,
} from './privateNotesApi';
import { encryptJson } from './privateNotesCrypto';
import { configureCrmSessionUser } from './crmSessionUser';
import {
  __resetPrivateNotesVaultForTests,
  getPrivateNotesCryptoKey,
  lockPrivateNotesVault,
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
        canEdit: true,
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

describe('addPrivateContactNote (org local)', () => {
  before(() => {
    installLocalStorage();
  });

  afterEach(() => {
    localStorage.removeItem('crm-org-private-notes');
    localStorage.removeItem(`crm-private-notes-vault:${OWNER}`);
    localStorage.removeItem(`crm-private-notes-items:${OWNER}`);
    configurePrivateNotesStore({ baseUrl: null });
    configureCrmSessionUser(null);
    __resetPrivateNotesVaultForTests();
  });

  it('stores and lists org private notes without a passphrase vault', async () => {
    configurePrivateNotesStore({ baseUrl: null });
    configureCrmSessionUser({
      id: OWNER,
      name: 'Test Operator',
      role: 'admin',
    });

    const created = await addPrivateContactNote({
      ownerUid: OWNER,
      contactId: 'contact-1',
      body: 'org confidential',
      target: { kind: 'contact', sourceLabel: 'Contact' },
      authorName: 'Test Operator',
    });
    assert.equal(created.visibility, 'private');
    assert.equal(created.body, 'org confidential');
    assert.equal(created.canEdit, true);

    const listed = await fetchDecryptedPrivateContactNotes(OWNER, 'contact-1');
    assert.equal(listed.lockedCount, 0);
    assert.equal(listed.notes.length, 1);
    assert.equal(listed.notes[0]?.body, 'org confidential');
    assert.equal(listed.notes[0]?.authorRole, 'admin');
  });

  it('lets a higher-rank viewer read another author private note', async () => {
    configurePrivateNotesStore({ baseUrl: null });
    configureCrmSessionUser({
      id: OWNER,
      name: 'Field Admin',
      role: 'admin',
    });
    await addPrivateContactNote({
      ownerUid: OWNER,
      contactId: 'contact-2',
      body: 'for my supervisor',
      target: { kind: 'contact', sourceLabel: 'Contact' },
      authorName: 'Field Admin',
    });

    configureCrmSessionUser({
      id: 'ceo-uid',
      name: 'CEO',
      role: 'ceo',
    });
    const listed = await fetchDecryptedPrivateContactNotes(
      'ceo-uid',
      'contact-2',
    );
    assert.equal(listed.notes.length, 1);
    assert.equal(listed.notes[0]?.body, 'for my supervisor');
    assert.equal(listed.notes[0]?.canEdit, false);
  });

  it('hides private notes from peer ranks', async () => {
    configurePrivateNotesStore({ baseUrl: null });
    configureCrmSessionUser({
      id: OWNER,
      name: 'Admin A',
      role: 'admin',
    });
    await addPrivateContactNote({
      ownerUid: OWNER,
      contactId: 'contact-3',
      body: 'peer secret',
      target: { kind: 'contact', sourceLabel: 'Contact' },
      authorName: 'Admin A',
    });

    configureCrmSessionUser({
      id: 'other-admin',
      name: 'Admin B',
      role: 'admin',
    });
    const listed = await fetchDecryptedPrivateContactNotes(
      'other-admin',
      'contact-3',
    );
    assert.equal(listed.notes.length, 0);
  });

  it('dual-reads unlocked legacy envelopes for the owner', async () => {
    configurePrivateNotesStore({ baseUrl: null });
    configureCrmSessionUser({
      id: OWNER,
      name: 'Owner',
      role: 'admin',
    });
    await setupPrivateNotesVault(OWNER, 'legacy-passphrase');
    const dek = getPrivateNotesCryptoKey();
    assert.ok(dek);
    const cipher = await encryptJson(dek!, {
      body: 'old vault note',
      contactId: 'contact-legacy',
      authorName: 'Owner',
      source: 'contact',
      sourceLabel: 'Contact',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await createPrivateNoteEnvelope(OWNER, {
      id: 'legacy-1',
      ownerUid: OWNER,
      contactId: 'contact-legacy',
      createdAt: '2026-01-01T00:00:00.000Z',
      alg: 'AES-GCM',
      iv: cipher.iv,
      ciphertext: cipher.ciphertext,
    });

    const unlocked = await fetchDecryptedPrivateContactNotes(
      OWNER,
      'contact-legacy',
    );
    assert.equal(unlocked.lockedCount, 0);
    assert.equal(unlocked.notes.length, 1);
    assert.equal(unlocked.notes[0]?.body, 'old vault note');
    assert.equal(unlocked.notes[0]?.canEdit, true);

    await lockPrivateNotesVault();
    const locked = await fetchDecryptedPrivateContactNotes(
      OWNER,
      'contact-legacy',
    );
    assert.equal(locked.notes.length, 0);
    assert.equal(locked.lockedCount, 1);
  });
});
