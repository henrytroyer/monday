/**
 * privateNotesCrypto.test.ts — E2E crypto round-trip for private notes.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createVerifier,
  decryptJson,
  decryptString,
  deriveKey,
  encryptJson,
  encryptString,
  generateSalt,
  PRIVATE_NOTES_VERIFIER_PLAINTEXT,
  verifyKey,
} from './privateNotesCrypto';

describe('privateNotesCrypto', () => {
  it('round-trips JSON with the derived key', async () => {
    const salt = generateSalt();
    const key = await deriveKey('test-passphrase-ok', salt);
    const payload = {
      body: 'Secret donor note',
      contactId: 'c-1',
      authorName: 'Henry',
    };
    const cipher = await encryptJson(key, payload);
    const plain = await decryptJson<typeof payload>(key, cipher);
    assert.deepEqual(plain, payload);
    assert.ok(cipher.iv.length > 0);
    assert.ok(cipher.ciphertext.length > 0);
  });

  it('fails decrypt with the wrong passphrase', async () => {
    const salt = generateSalt();
    const key = await deriveKey('correct-horse-battery', salt);
    const cipher = await encryptString(key, 'top secret');
    const wrong = await deriveKey('wrong-passphrase!!', salt);
    await assert.rejects(() => decryptString(wrong, cipher));
  });

  it('verifies passphrase via encrypted constant', async () => {
    const salt = generateSalt();
    const key = await deriveKey('verify-me-please', salt);
    const verifier = await createVerifier(key);
    assert.equal(await verifyKey(key, verifier), true);

    const wrong = await deriveKey('not-the-passphrase', salt);
    assert.equal(await verifyKey(wrong, verifier), false);

    const opened = await decryptString(key, verifier);
    assert.equal(opened, PRIVATE_NOTES_VERIFIER_PLAINTEXT);
  });

  it('uses distinct ciphertext for the same plaintext', async () => {
    const salt = generateSalt();
    const key = await deriveKey('same-pass-twice!!', salt);
    const a = await encryptString(key, 'same body');
    const b = await encryptString(key, 'same body');
    assert.notEqual(a.iv, b.iv);
    assert.notEqual(a.ciphertext, b.ciphertext);
  });
});
