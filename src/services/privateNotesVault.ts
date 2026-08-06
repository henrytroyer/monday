/**
 * privateNotesVault.ts — Passphrase / recovery-key unlock with DEK wrapping.
 * Note bodies use DEK; passphrase + recovery key only wrap the DEK.
 */

import {
  base64ToBytes,
  bytesToBase64,
  createVerifier,
  deriveExtractableKey,
  generateDek,
  generateRecoveryKey,
  generateSalt,
  normalizeRecoveryKey,
  unwrapDek,
  verifyKey,
  wrapDek,
  type CipherPayload,
} from './privateNotesCrypto';
import {
  fetchPrivateNotesVault,
  isPrivateNotesStoreAvailable,
  putPrivateNotesVault,
  type PrivateNotesVaultRecord,
} from './privateNotesApi';

const IDB_NAME = 'crm-private-notes-vault';
const IDB_STORE = 'keys';
const IDB_VERSION = 1;

export type VaultStatus =
  | 'unavailable'
  | 'loading'
  | 'needs_setup'
  | 'locked'
  | 'unlocked';

type Listener = () => void;

let memoryKey: CryptoKey | null = null;
let memoryOwnerUid: string | null = null;
let cachedVault: PrivateNotesVaultRecord | null = null;
let status: VaultStatus = 'loading';
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribePrivateNotesVault(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPrivateNotesVaultStatus(): VaultStatus {
  return status;
}

export function isPrivateNotesVaultUnlocked(): boolean {
  return status === 'unlocked' && memoryKey != null;
}

/** Unlocked DEK used to encrypt/decrypt note bodies. */
export function getPrivateNotesCryptoKey(): CryptoKey | null {
  return memoryKey;
}

export function getCachedPrivateNotesVault(): PrivateNotesVaultRecord | null {
  return cachedVault;
}

export function hasRecoveryKey(
  vault: PrivateNotesVaultRecord | null | undefined,
): boolean {
  return Boolean(
    vault?.recoverySalt &&
      vault.recoveryWrappedDek?.iv &&
      vault.recoveryWrappedDek?.ciphertext,
  );
}

function setStatus(next: VaultStatus): void {
  status = next;
  notify();
}

function assertPassphrase(passphrase: string): string {
  const trimmed = passphrase.trim();
  if (trimmed.length < 8) {
    throw new Error('Passphrase must be at least 8 characters');
  }
  return trimmed;
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onerror = () => resolve(null);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(ownerUid: string): Promise<CryptoKey | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(ownerUid);
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const value = req.result;
        resolve(value instanceof CryptoKey ? value : null);
      };
    } catch {
      resolve(null);
    } finally {
      db.close();
    }
  });
}

async function idbPut(ownerUid: string, key: CryptoKey): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(key, ownerUid);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function idbDelete(ownerUid: string): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(ownerUid);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function cacheUnlocked(
  ownerUid: string,
  dek: CryptoKey,
  vault: PrivateNotesVaultRecord,
): Promise<void> {
  memoryKey = dek;
  memoryOwnerUid = ownerUid;
  cachedVault = vault;
  await idbPut(ownerUid, dek);
  setStatus('unlocked');
}

async function verifyPassphraseWrapKey(
  passphrase: string,
  vault: PrivateNotesVaultRecord,
): Promise<CryptoKey> {
  const salt = base64ToBytes(vault.salt);
  const wrapKey = await deriveExtractableKey(passphrase, salt);
  if (await verifyKey(wrapKey, vault.verifier)) return wrapKey;
  throw new Error('Incorrect passphrase');
}

async function resolveDekFromPassphrase(
  wrapKey: CryptoKey,
  vault: PrivateNotesVaultRecord,
): Promise<{ dek: CryptoKey; vault: PrivateNotesVaultRecord }> {
  if (vault.wrappedDek) {
    const dek = await unwrapDek(wrapKey, vault.wrappedDek);
    return { dek, vault };
  }

  // Legacy: passphrase key encrypted notes directly — treat it as DEK and migrate wraps.
  const dek = wrapKey;
  const wrappedDek = await wrapDek(wrapKey, dek);
  const dekVerifier = await createVerifier(dek);
  const migrated: PrivateNotesVaultRecord = {
    ...vault,
    wrappedDek,
    dekVerifier,
  };
  await putPrivateNotesVault(vault.ownerUid, migrated);
  return { dek, vault: migrated };
}

export async function refreshPrivateNotesVault(
  ownerUid: string | null,
): Promise<VaultStatus> {
  if (!ownerUid) {
    memoryKey = null;
    memoryOwnerUid = null;
    cachedVault = null;
    setStatus('unavailable');
    return status;
  }

  if (!isPrivateNotesStoreAvailable()) {
    memoryKey = null;
    memoryOwnerUid = ownerUid;
    cachedVault = null;
    setStatus('unavailable');
    return status;
  }

  memoryOwnerUid = ownerUid;
  setStatus('loading');

  try {
    const vault = await fetchPrivateNotesVault(ownerUid);
    cachedVault = vault;

    if (!vault) {
      memoryKey = null;
      setStatus('needs_setup');
      return status;
    }

    const cached = await idbGet(ownerUid);
    if (cached) {
      if (vault.dekVerifier && (await verifyKey(cached, vault.dekVerifier))) {
        memoryKey = cached;
        setStatus('unlocked');
        return status;
      }
      // Legacy device cache: key matched passphrase verifier
      if (
        !vault.wrappedDek &&
        (await verifyKey(cached, vault.verifier))
      ) {
        memoryKey = cached;
        setStatus('unlocked');
        return status;
      }
    }

    memoryKey = null;
    setStatus('locked');
    return status;
  } catch {
    memoryKey = null;
    cachedVault = null;
    setStatus('unavailable');
    return status;
  }
}

export async function setupPrivateNotesVault(
  ownerUid: string,
  passphrase: string,
): Promise<{ recoveryKey: string }> {
  const trimmed = assertPassphrase(passphrase);
  if (!isPrivateNotesStoreAvailable()) {
    throw new Error('Private notes store is not available');
  }

  const existing = await fetchPrivateNotesVault(ownerUid);
  if (existing) {
    throw new Error('Private notes vault already exists — unlock instead');
  }

  const salt = generateSalt();
  const wrapKey = await deriveExtractableKey(trimmed, salt);
  const verifier = await createVerifier(wrapKey);
  const dek = await generateDek();
  const wrappedDek = await wrapDek(wrapKey, dek);
  const dekVerifier = await createVerifier(dek);

  const recoveryKey = generateRecoveryKey();
  const recoverySalt = generateSalt();
  const recoveryWrap = await deriveExtractableKey(
    normalizeRecoveryKey(recoveryKey),
    recoverySalt,
  );
  const recoveryWrappedDek = await wrapDek(recoveryWrap, dek);
  const recoveryCreatedAt = new Date().toISOString();

  const record: PrivateNotesVaultRecord = {
    ownerUid,
    salt: bytesToBase64(salt),
    verifier,
    wrappedDek,
    dekVerifier,
    recoverySalt: bytesToBase64(recoverySalt),
    recoveryWrappedDek,
    recoveryCreatedAt,
    alg: 'AES-GCM',
    kdf: 'PBKDF2',
    createdAt: recoveryCreatedAt,
  };
  await putPrivateNotesVault(ownerUid, record);
  await cacheUnlocked(ownerUid, dek, record);
  return { recoveryKey };
}

export async function unlockPrivateNotesVault(
  ownerUid: string,
  passphrase: string,
): Promise<void> {
  const trimmed = passphrase.trim();
  if (!trimmed) {
    throw new Error('Enter your private notes passphrase');
  }
  if (!isPrivateNotesStoreAvailable()) {
    throw new Error('Private notes store is not available');
  }

  const vault =
    cachedVault?.ownerUid === ownerUid
      ? cachedVault
      : await fetchPrivateNotesVault(ownerUid);
  if (!vault) {
    throw new Error('No private notes vault — set a passphrase first');
  }

  const wrapKey = await verifyPassphraseWrapKey(trimmed, vault);
  const resolved = await resolveDekFromPassphrase(wrapKey, vault);
  await cacheUnlocked(ownerUid, resolved.dek, resolved.vault);
}

export async function changePrivateNotesPassphrase(
  ownerUid: string,
  currentPassphrase: string,
  newPassphrase: string,
): Promise<void> {
  const current = currentPassphrase.trim();
  const next = assertPassphrase(newPassphrase);
  if (!isPrivateNotesStoreAvailable()) {
    throw new Error('Private notes store is not available');
  }

  const vault =
    cachedVault?.ownerUid === ownerUid
      ? cachedVault
      : await fetchPrivateNotesVault(ownerUid);
  if (!vault) {
    throw new Error('No private notes vault');
  }

  const wrapKey = await verifyPassphraseWrapKey(current, vault);
  const { dek, vault: currentVault } = await resolveDekFromPassphrase(
    wrapKey,
    vault,
  );

  const salt = generateSalt();
  const newWrap = await deriveExtractableKey(next, salt);
  const verifier = await createVerifier(newWrap);
  const wrappedDek = await wrapDek(newWrap, dek);
  const dekVerifier = currentVault.dekVerifier ?? (await createVerifier(dek));

  const record: PrivateNotesVaultRecord = {
    ...currentVault,
    salt: bytesToBase64(salt),
    verifier,
    wrappedDek,
    dekVerifier,
  };
  await putPrivateNotesVault(ownerUid, record);
  await cacheUnlocked(ownerUid, dek, record);
}

export async function recoverPrivateNotesVault(
  ownerUid: string,
  recoveryKey: string,
  newPassphrase: string,
): Promise<void> {
  const next = assertPassphrase(newPassphrase);
  const normalized = normalizeRecoveryKey(recoveryKey);
  if (normalized.length < 32) {
    throw new Error('Enter your full recovery key');
  }
  if (!isPrivateNotesStoreAvailable()) {
    throw new Error('Private notes store is not available');
  }

  const vault =
    cachedVault?.ownerUid === ownerUid
      ? cachedVault
      : await fetchPrivateNotesVault(ownerUid);
  if (!vault || !hasRecoveryKey(vault)) {
    throw new Error('No recovery key is configured for this vault');
  }

  const recoverySalt = base64ToBytes(vault.recoverySalt!);
  const recoveryWrap = await deriveExtractableKey(normalized, recoverySalt);
  let dek: CryptoKey;
  try {
    dek = await unwrapDek(recoveryWrap, vault.recoveryWrappedDek!);
  } catch {
    throw new Error('Incorrect recovery key');
  }

  const salt = generateSalt();
  const newWrap = await deriveExtractableKey(next, salt);
  const verifier = await createVerifier(newWrap);
  const wrappedDek = await wrapDek(newWrap, dek);
  const dekVerifier = vault.dekVerifier ?? (await createVerifier(dek));

  const record: PrivateNotesVaultRecord = {
    ...vault,
    salt: bytesToBase64(salt),
    verifier,
    wrappedDek,
    dekVerifier,
  };
  await putPrivateNotesVault(ownerUid, record);
  await cacheUnlocked(ownerUid, dek, record);
}

export async function rotateRecoveryKey(
  ownerUid: string,
): Promise<{ recoveryKey: string }> {
  if (!isPrivateNotesStoreAvailable()) {
    throw new Error('Private notes store is not available');
  }
  if (!memoryKey || memoryOwnerUid !== ownerUid) {
    throw new Error('Unlock private notes before creating a recovery key');
  }

  const vault =
    cachedVault?.ownerUid === ownerUid
      ? cachedVault
      : await fetchPrivateNotesVault(ownerUid);
  if (!vault) {
    throw new Error('No private notes vault');
  }

  const dek = memoryKey;
  let nextVault = vault;
  if (!vault.wrappedDek) {
    // Should already be migrated on unlock; ensure wraps exist for passphrase path.
    throw new Error(
      'Unlock with your passphrase once before creating a recovery key',
    );
  }

  const recoveryKey = generateRecoveryKey();
  const recoverySalt = generateSalt();
  const recoveryWrap = await deriveExtractableKey(
    normalizeRecoveryKey(recoveryKey),
    recoverySalt,
  );
  const recoveryWrappedDek = await wrapDek(recoveryWrap, dek);
  const recoveryCreatedAt = new Date().toISOString();
  const dekVerifier = vault.dekVerifier ?? (await createVerifier(dek));

  nextVault = {
    ...vault,
    dekVerifier,
    recoverySalt: bytesToBase64(recoverySalt),
    recoveryWrappedDek,
    recoveryCreatedAt,
  };
  await putPrivateNotesVault(ownerUid, nextVault);
  cachedVault = nextVault;
  notify();
  return { recoveryKey };
}

export async function lockPrivateNotesVault(): Promise<void> {
  const owner = memoryOwnerUid;
  memoryKey = null;
  if (owner) {
    await idbDelete(owner);
  }
  if (!owner || !isPrivateNotesStoreAvailable()) {
    setStatus('unavailable');
    return;
  }
  setStatus(cachedVault ? 'locked' : 'needs_setup');
}

/** Test helper — reset in-memory vault state. */
export function __resetPrivateNotesVaultForTests(): void {
  memoryKey = null;
  memoryOwnerUid = null;
  cachedVault = null;
  status = 'loading';
}

export type { CipherPayload, PrivateNotesVaultRecord };
