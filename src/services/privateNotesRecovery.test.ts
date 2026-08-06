/**
 * privateNotesRecovery.test.ts — DEK wrap, recover, change passphrase, rotate.
 */

import assert from 'node:assert/strict';
import { afterEach, before, describe, it } from 'node:test';
import {
  decryptString,
  encryptString,
  generateRecoveryKey,
  normalizeRecoveryKey,
} from './privateNotesCrypto';
import { configurePrivateNotesStore } from './privateNotesApi';
import {
  __resetPrivateNotesVaultForTests,
  changePrivateNotesPassphrase,
  getPrivateNotesCryptoKey,
  lockPrivateNotesVault,
  recoverPrivateNotesVault,
  rotateRecoveryKey,
  setupPrivateNotesVault,
  unlockPrivateNotesVault,
} from './privateNotesVault';

const OWNER = 'recovery-owner-uid';

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
  configurePrivateNotesStore({ baseUrl: null });
  __resetPrivateNotesVaultForTests();
}

describe('privateNotesRecovery', () => {
  before(() => {
    installLocalStorage();
  });

  afterEach(() => {
    clearOwner();
  });

  it('generates a grouped recovery key that normalizes stably', () => {
    const key = generateRecoveryKey();
    assert.match(key, /^[0-9A-F]{4}(-[0-9A-F]{4})+$/);
    const n = normalizeRecoveryKey(key);
    assert.equal(n.length, 64);
    assert.equal(normalizeRecoveryKey(n), n);
    assert.equal(normalizeRecoveryKey(key.toLowerCase().replace(/-/g, ' ')), n);
  });

  it('recovers with recovery key and keeps decrypting note ciphertext', async () => {
    const { recoveryKey } = await setupPrivateNotesVault(OWNER, 'original-pass');
    const dek = getPrivateNotesCryptoKey();
    assert.ok(dek);
    const cipher = await encryptString(dek!, 'keep this secret');

    await lockPrivateNotesVault();
    await recoverPrivateNotesVault(OWNER, recoveryKey, 'brand-new-pass');
    const dek2 = getPrivateNotesCryptoKey();
    assert.ok(dek2);
    assert.equal(await decryptString(dek2!, cipher), 'keep this secret');

    await lockPrivateNotesVault();
    await unlockPrivateNotesVault(OWNER, 'brand-new-pass');
    assert.equal(
      await decryptString(getPrivateNotesCryptoKey()!, cipher),
      'keep this secret',
    );
  });

  it('rejects a wrong recovery key', async () => {
    const { recoveryKey } = await setupPrivateNotesVault(OWNER, 'original-pass');
    assert.ok(recoveryKey);
    await lockPrivateNotesVault();
    await assert.rejects(
      () =>
        recoverPrivateNotesVault(
          OWNER,
          '0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000',
          'another-passphrase',
        ),
      /Incorrect recovery key/,
    );
  });

  it('change passphrase keeps note decrypt; old passphrase fails', async () => {
    await setupPrivateNotesVault(OWNER, 'first-passphrase');
    const cipher = await encryptString(
      getPrivateNotesCryptoKey()!,
      'stable body',
    );

    await changePrivateNotesPassphrase(
      OWNER,
      'first-passphrase',
      'second-passphrase',
    );
    assert.equal(
      await decryptString(getPrivateNotesCryptoKey()!, cipher),
      'stable body',
    );

    await lockPrivateNotesVault();
    await assert.rejects(
      () => unlockPrivateNotesVault(OWNER, 'first-passphrase'),
      /Incorrect passphrase/,
    );
    await unlockPrivateNotesVault(OWNER, 'second-passphrase');
    assert.equal(
      await decryptString(getPrivateNotesCryptoKey()!, cipher),
      'stable body',
    );
  });

  it('rotate recovery key invalidates the previous key', async () => {
    const { recoveryKey: first } = await setupPrivateNotesVault(
      OWNER,
      'rotate-pass-ok',
    );
    const { recoveryKey: second } = await rotateRecoveryKey(OWNER);
    assert.notEqual(normalizeRecoveryKey(first), normalizeRecoveryKey(second));

    await lockPrivateNotesVault();
    await assert.rejects(
      () => recoverPrivateNotesVault(OWNER, first, 'after-rotate-pass'),
      /Incorrect recovery key/,
    );
    await recoverPrivateNotesVault(OWNER, second, 'after-rotate-pass');
    assert.ok(getPrivateNotesCryptoKey());
  });
});
