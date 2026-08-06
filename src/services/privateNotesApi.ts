/**
 * privateNotesApi.ts — CRUD for private-note ciphertext envelopes.
 * Bodies are already encrypted client-side; this layer only stores opaque blobs.
 *
 * Production: VITE_PRIVATE_NOTES_URL → i58finance Cloud Function (Firebase auth).
 * Local: /api/private-notes → server/private-notes-proxy.mjs (X-Owner-Uid).
 * Fallback: localStorage (device-only; no cross-device sync).
 */

import { getMondayProxyAuthToken } from './mondayProxyAuth';
import type { CipherPayload } from './privateNotesCrypto';

export interface PrivateNotesVaultRecord {
  ownerUid: string;
  /** Salt for passphrase → wrap-key KDF */
  salt: string;
  /** Verifies passphrase wrap key */
  verifier: CipherPayload;
  alg: string;
  kdf: string;
  createdAt: string;
  /** DEK encrypted by passphrase-derived wrap key (v2+) */
  wrappedDek?: CipherPayload;
  /** Verifies the DEK itself (device cache + unlock) */
  dekVerifier?: CipherPayload;
  /** Salt for recovery-key → wrap-key KDF */
  recoverySalt?: string;
  /** DEK encrypted by recovery-derived wrap key */
  recoveryWrappedDek?: CipherPayload;
  recoveryCreatedAt?: string;
}

export interface PrivateNoteEnvelope {
  id: string;
  ownerUid: string;
  contactId: string;
  createdAt: string;
  alg: string;
  iv: string;
  ciphertext: string;
}

type StoreMode = 'remote' | 'localStorage' | 'none';

const LOCAL_VAULT_PREFIX = 'crm-private-notes-vault:';
const LOCAL_NOTES_PREFIX = 'crm-private-notes-items:';

let storeBaseOverride: string | null = null;

/** Host Admin may inject the Cloud Function URL. */
export function configurePrivateNotesStore(options: {
  baseUrl?: string | null;
}): void {
  const base = options.baseUrl?.trim();
  storeBaseOverride = base ? base.replace(/\/$/, '') : null;
}

function envBase(): string | null {
  const fromEnv = (
    import.meta.env as Record<string, string | undefined> | undefined
  )?.VITE_PRIVATE_NOTES_URL?.trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (storeBaseOverride) return storeBaseOverride;
  // No URL → localStorage (device-only). Set VITE_PRIVATE_NOTES_URL=/api/private-notes
  // with `npm run private-notes:proxy`, or the production Cloud Function URL, to sync.
  return null;
}

function resolveMode(): StoreMode {
  if (envBase()) return 'remote';
  if (typeof localStorage !== 'undefined') return 'localStorage';
  return 'none';
}

export function isPrivateNotesStoreAvailable(): boolean {
  return resolveMode() !== 'none';
}

export function getPrivateNotesStoreMode(): StoreMode {
  return resolveMode();
}

function localVaultKey(ownerUid: string): string {
  return `${LOCAL_VAULT_PREFIX}${ownerUid}`;
}

function localNotesKey(ownerUid: string): string {
  return `${LOCAL_NOTES_PREFIX}${ownerUid}`;
}

function readLocalNotes(ownerUid: string): PrivateNoteEnvelope[] {
  try {
    const raw = localStorage.getItem(localNotesKey(ownerUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrivateNoteEnvelope[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalNotes(ownerUid: string, notes: PrivateNoteEnvelope[]): void {
  localStorage.setItem(localNotesKey(ownerUid), JSON.stringify(notes));
}

async function remoteFetch(
  path: string,
  ownerUid: string,
  init?: RequestInit,
): Promise<Response> {
  const base = envBase();
  if (!base) {
    throw new Error('Private notes store URL is not configured');
  }
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Owner-Uid', ownerUid);
  const token = await getMondayProxyAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${base}${path}`, { ...init, headers });
}

export async function fetchPrivateNotesVault(
  ownerUid: string,
): Promise<PrivateNotesVaultRecord | null> {
  const mode = resolveMode();
  if (mode === 'none') return null;

  if (mode === 'localStorage') {
    try {
      const raw = localStorage.getItem(localVaultKey(ownerUid));
      if (!raw) return null;
      return JSON.parse(raw) as PrivateNotesVaultRecord;
    } catch {
      return null;
    }
  }

  const res = await remoteFetch('/vault', ownerUid);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load private notes vault (${res.status})`);
  }
  return (await res.json()) as PrivateNotesVaultRecord;
}

export async function putPrivateNotesVault(
  ownerUid: string,
  vault: PrivateNotesVaultRecord,
): Promise<void> {
  const mode = resolveMode();
  if (mode === 'none') {
    throw new Error('Private notes store is not available');
  }

  if (mode === 'localStorage') {
    localStorage.setItem(localVaultKey(ownerUid), JSON.stringify(vault));
    return;
  }

  const res = await remoteFetch('/vault', ownerUid, {
    method: 'PUT',
    body: JSON.stringify(vault),
  });
  if (!res.ok) {
    throw new Error(`Failed to save private notes vault (${res.status})`);
  }
}

export async function listPrivateNoteEnvelopes(
  ownerUid: string,
  contactId: string,
): Promise<PrivateNoteEnvelope[]> {
  const mode = resolveMode();
  if (mode === 'none') return [];

  if (mode === 'localStorage') {
    return readLocalNotes(ownerUid).filter((n) => n.contactId === contactId);
  }

  const res = await remoteFetch(
    `/notes?contactId=${encodeURIComponent(contactId)}`,
    ownerUid,
  );
  if (!res.ok) {
    throw new Error(`Failed to list private notes (${res.status})`);
  }
  const data = (await res.json()) as { notes?: PrivateNoteEnvelope[] };
  return Array.isArray(data.notes) ? data.notes : [];
}

export async function createPrivateNoteEnvelope(
  ownerUid: string,
  envelope: PrivateNoteEnvelope,
): Promise<PrivateNoteEnvelope> {
  const mode = resolveMode();
  if (mode === 'none') {
    throw new Error('Private notes store is not available');
  }

  if (mode === 'localStorage') {
    const notes = readLocalNotes(ownerUid);
    notes.push(envelope);
    writeLocalNotes(ownerUid, notes);
    return envelope;
  }

  const res = await remoteFetch('/notes', ownerUid, {
    method: 'POST',
    body: JSON.stringify(envelope),
  });
  if (!res.ok) {
    throw new Error(`Failed to save private note (${res.status})`);
  }
  return (await res.json()) as PrivateNoteEnvelope;
}

export async function deletePrivateNoteEnvelope(
  ownerUid: string,
  noteId: string,
): Promise<void> {
  const mode = resolveMode();
  if (mode === 'none') return;

  if (mode === 'localStorage') {
    writeLocalNotes(
      ownerUid,
      readLocalNotes(ownerUid).filter((n) => n.id !== noteId),
    );
    return;
  }

  const res = await remoteFetch(
    `/notes/${encodeURIComponent(noteId)}`,
    ownerUid,
    { method: 'DELETE' },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete private note (${res.status})`);
  }
}
