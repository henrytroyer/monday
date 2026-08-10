/**
 * privateNotesMigrate.test.ts — Legacy E2E vault → org store migration.
 */

import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import {
  configurePrivateNotesStore,
  createPrivateNoteEnvelope,
  listLegacyPrivateNoteEnvelopes,
  listOrgPrivateNotes,
} from './privateNotesApi';
import { encryptJson } from './privateNotesCrypto';
import {
  migrateLegacyPrivateNotesToOrg,
  countLegacyPrivateNotes,
} from './privateNotesMigrate';
import { configureCrmSessionUser } from './crmSessionUser';
import {
  __resetPrivateNotesVaultForTests,
  getPrivateNotesCryptoKey,
  lockPrivateNotesVault,
  setupPrivateNotesVault,
} from './privateNotesVault';

const OWNER = 'migrate-owner-uid';

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

function clearOwner(): void {
  localStorage.removeItem(`crm-private-notes-vault:${OWNER}`);
  localStorage.removeItem(`crm-private-notes-items:${OWNER}`);
  localStorage.removeItem('crm-org-private-notes');
  configurePrivateNotesStore({ baseUrl: null });
  configureCrmSessionUser(null);
  __resetPrivateNotesVaultForTests();
}

describe('privateNotesMigrate', () => {
  before(() => {
    installLocalStorage();
  });

  afterEach(() => {
    clearOwner();
  });

  it('requires an unlocked vault before migrating', async () => {
    await setupPrivateNotesVault(OWNER, 'migrate-passphrase');
    await lockPrivateNotesVault();
    await assert.rejects(
      () => migrateLegacyPrivateNotesToOrg(OWNER),
      /Unlock your old private notes vault/,
    );
  });

  it('decrypts legacy envelopes into org notes and deletes legacy', async () => {
    await setupPrivateNotesVault(OWNER, 'migrate-passphrase');
    const dek = getPrivateNotesCryptoKey();
    assert.ok(dek);

    const plain = {
      body: 'Legacy confidential note',
      contactId: 'contact-42',
      authorName: 'Lesvos Coordinator',
      source: 'contact' as const,
      sourceLabel: 'Contact',
    };
    const cipher = await encryptJson(dek!, plain);
    await createPrivateNoteEnvelope(OWNER, {
      id: 'legacy-note-1',
      ownerUid: OWNER,
      contactId: plain.contactId,
      createdAt: '2026-01-15T12:00:00.000Z',
      alg: 'AES-GCM',
      iv: cipher.iv,
      ciphertext: cipher.ciphertext,
    });

    assert.equal(await countLegacyPrivateNotes(OWNER), 1);

    configureCrmSessionUser({
      id: OWNER,
      name: 'Lesvos Coordinator',
      role: 'admin',
    });

    const result = await migrateLegacyPrivateNotesToOrg(OWNER);
    assert.deepEqual(result, { migrated: 1, failed: 0, skipped: 0 });
    assert.equal(await countLegacyPrivateNotes(OWNER), 0);
    assert.equal((await listLegacyPrivateNoteEnvelopes(OWNER)).length, 0);

    const org = await listOrgPrivateNotes(OWNER, plain.contactId);
    assert.equal(org.length, 1);
    assert.equal(org[0]?.id, 'legacy-note-1');
    assert.equal(org[0]?.body, plain.body);
    assert.equal(org[0]?.authorUid, OWNER);
    assert.equal(org[0]?.canEdit, true);
    assert.equal(org[0]?.authorName, plain.authorName);
  });

  it('skips envelopes with empty body after decrypt', async () => {
    await setupPrivateNotesVault(OWNER, 'migrate-passphrase');
    const dek = getPrivateNotesCryptoKey();
    assert.ok(dek);

    const cipher = await encryptJson(dek!, {
      body: '   ',
      contactId: 'contact-empty',
      authorName: 'X',
      source: 'contact',
      sourceLabel: 'Contact',
    });
    await createPrivateNoteEnvelope(OWNER, {
      id: 'empty-body',
      ownerUid: OWNER,
      contactId: 'contact-empty',
      createdAt: '2026-01-15T12:00:00.000Z',
      alg: 'AES-GCM',
      iv: cipher.iv,
      ciphertext: cipher.ciphertext,
    });

    configureCrmSessionUser({
      id: OWNER,
      name: 'X',
      role: 'admin',
    });

    const result = await migrateLegacyPrivateNotesToOrg(OWNER);
    assert.equal(result.skipped, 1);
    assert.equal(result.migrated, 0);
    // Skip leaves the legacy envelope in place
    assert.equal(await countLegacyPrivateNotes(OWNER), 1);
  });
});
