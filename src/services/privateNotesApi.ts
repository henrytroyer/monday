/**
 * privateNotesApi.ts — Org-confidential private notes + legacy E2E vault APIs.
 *
 * Org notes: server encrypts bodies; ACL = author OR higher Admin role (read).
 * Legacy vault/envelopes kept for one-time owner migration.
 *
 * Production: VITE_PRIVATE_NOTES_URL → i58finance Cloud Function.
 * Local: /api/private-notes → server/private-notes-proxy.mjs.
 * Fallback: localStorage (device-only).
 */

import { getMondayProxyAuthToken } from './mondayProxyAuth';
import { getCrmSessionUser } from './crmSessionUser';
import { crmRoleRank, isCrmRoleAbove } from '../utils/crmOperatorRoles';
import type { CipherPayload } from './privateNotesCrypto';
import type { ContactInternalNoteSource } from '../types/contact';

export interface PrivateNotesVaultRecord {
  ownerUid: string;
  salt: string;
  verifier: CipherPayload;
  alg: string;
  kdf: string;
  createdAt: string;
  wrappedDek?: CipherPayload;
  dekVerifier?: CipherPayload;
  recoverySalt?: string;
  recoveryWrappedDek?: CipherPayload;
  recoveryCreatedAt?: string;
}

/** Legacy per-owner E2E envelope (ciphertext only). */
export interface PrivateNoteEnvelope {
  id: string;
  ownerUid: string;
  contactId: string;
  createdAt: string;
  alg: string;
  iv: string;
  ciphertext: string;
}

/** Org private note as returned by the store (plaintext body after server decrypt). */
export interface OrgPrivateNoteRecord {
  id: string;
  authorUid: string;
  authorName: string;
  authorRole: string;
  authorRank: number;
  contactId: string;
  createdAt: string;
  body: string;
  source: ContactInternalNoteSource;
  sourceLabel: string;
  timelineId?: string;
  applicationItemId?: string;
  recruitmentProspectId?: string;
  canEdit: boolean;
}

export type OrgPrivateNoteCreateInput = {
  id?: string;
  contactId: string;
  body: string;
  authorName: string;
  source: ContactInternalNoteSource;
  sourceLabel: string;
  timelineId?: string;
  applicationItemId?: string;
  recruitmentProspectId?: string;
};

type StoreMode = 'remote' | 'localStorage' | 'none';

const LOCAL_VAULT_PREFIX = 'crm-private-notes-vault:';
const LOCAL_NOTES_PREFIX = 'crm-private-notes-items:';
const LOCAL_ORG_NOTES_KEY = 'crm-org-private-notes';

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

function readLocalLegacyNotes(ownerUid: string): PrivateNoteEnvelope[] {
  try {
    const raw = localStorage.getItem(localNotesKey(ownerUid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrivateNoteEnvelope[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalLegacyNotes(
  ownerUid: string,
  notes: PrivateNoteEnvelope[],
): void {
  localStorage.setItem(localNotesKey(ownerUid), JSON.stringify(notes));
}

function readLocalOrgNotes(): OrgPrivateNoteRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORG_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrgPrivateNoteRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalOrgNotes(notes: OrgPrivateNoteRecord[]): void {
  localStorage.setItem(LOCAL_ORG_NOTES_KEY, JSON.stringify(notes));
}

function newNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  const session = getCrmSessionUser();
  if (session?.role) {
    headers.set('X-Operator-Role', session.role);
  }
  const token = await getMondayProxyAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${base}${path}`, { ...init, headers });
}

// ——— Legacy vault (migration) ———

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

/** Legacy per-owner envelopes (ciphertext) for migration. */
export async function listLegacyPrivateNoteEnvelopes(
  ownerUid: string,
  contactId?: string,
): Promise<PrivateNoteEnvelope[]> {
  const mode = resolveMode();
  if (mode === 'none') return [];

  if (mode === 'localStorage') {
    const notes = readLocalLegacyNotes(ownerUid);
    return contactId
      ? notes.filter((n) => n.contactId === contactId)
      : notes;
  }

  const qs = contactId
    ? `?contactId=${encodeURIComponent(contactId)}`
    : '';
  const res = await remoteFetch(`/legacy/notes${qs}`, ownerUid);
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Failed to list legacy private notes (${res.status})`);
  }
  const data = (await res.json()) as { notes?: PrivateNoteEnvelope[] };
  return Array.isArray(data.notes) ? data.notes : [];
}

/** @deprecated Use listOrgPrivateNotes — kept for older call sites during transition. */
export async function listPrivateNoteEnvelopes(
  ownerUid: string,
  contactId: string,
): Promise<PrivateNoteEnvelope[]> {
  return listLegacyPrivateNoteEnvelopes(ownerUid, contactId);
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
    const notes = readLocalLegacyNotes(ownerUid);
    notes.push(envelope);
    writeLocalLegacyNotes(ownerUid, notes);
    return envelope;
  }

  const res = await remoteFetch('/legacy/notes', ownerUid, {
    method: 'POST',
    body: JSON.stringify(envelope),
  });
  if (!res.ok) {
    throw new Error(`Failed to save legacy private note (${res.status})`);
  }
  return (await res.json()) as PrivateNoteEnvelope;
}

export async function deleteLegacyPrivateNoteEnvelope(
  ownerUid: string,
  noteId: string,
): Promise<void> {
  const mode = resolveMode();
  if (mode === 'none') return;

  if (mode === 'localStorage') {
    writeLocalLegacyNotes(
      ownerUid,
      readLocalLegacyNotes(ownerUid).filter((n) => n.id !== noteId),
    );
    return;
  }

  const res = await remoteFetch(
    `/legacy/notes/${encodeURIComponent(noteId)}`,
    ownerUid,
    { method: 'DELETE' },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete legacy private note (${res.status})`);
  }
}

export async function deletePrivateNoteEnvelope(
  ownerUid: string,
  noteId: string,
): Promise<void> {
  return deleteLegacyPrivateNoteEnvelope(ownerUid, noteId);
}

// ——— Org confidential notes ———

function filterLocalOrgNotesForViewer(
  notes: OrgPrivateNoteRecord[],
  contactId: string,
  viewerUid: string,
  viewerRole: string | undefined,
): OrgPrivateNoteRecord[] {
  return notes
    .filter((n) => n.contactId === contactId)
    .filter(
      (n) =>
        n.authorUid === viewerUid ||
        isCrmRoleAbove(viewerRole, n.authorRole),
    )
    .map((n) => ({
      ...n,
      canEdit: n.authorUid === viewerUid,
      authorRank: n.authorRank || crmRoleRank(n.authorRole),
    }));
}

export async function listOrgPrivateNotes(
  ownerUid: string,
  contactId: string,
): Promise<OrgPrivateNoteRecord[]> {
  const mode = resolveMode();
  if (mode === 'none') return [];

  if (mode === 'localStorage') {
    const session = getCrmSessionUser();
    return filterLocalOrgNotesForViewer(
      readLocalOrgNotes(),
      contactId,
      ownerUid,
      session?.role,
    );
  }

  const res = await remoteFetch(
    `/notes?contactId=${encodeURIComponent(contactId)}`,
    ownerUid,
  );
  if (!res.ok) {
    throw new Error(`Failed to list private notes (${res.status})`);
  }
  const data = (await res.json()) as { notes?: OrgPrivateNoteRecord[] };
  return Array.isArray(data.notes) ? data.notes : [];
}

export async function createOrgPrivateNote(
  ownerUid: string,
  input: OrgPrivateNoteCreateInput,
): Promise<OrgPrivateNoteRecord> {
  const mode = resolveMode();
  if (mode === 'none') {
    throw new Error('Private notes store is not available');
  }

  const session = getCrmSessionUser();
  const authorRole = session?.role?.trim() || 'user';
  const createdAt = new Date().toISOString();
  const id = input.id?.trim() || newNoteId();

  if (mode === 'localStorage') {
    const record: OrgPrivateNoteRecord = {
      id,
      authorUid: ownerUid,
      authorName: input.authorName.trim() || 'Coordinator',
      authorRole,
      authorRank: crmRoleRank(authorRole),
      contactId: input.contactId,
      createdAt,
      body: input.body.trim(),
      source: input.source,
      sourceLabel: input.sourceLabel,
      timelineId: input.timelineId,
      applicationItemId: input.applicationItemId,
      recruitmentProspectId: input.recruitmentProspectId,
      canEdit: true,
    };
    const notes = readLocalOrgNotes();
    notes.push(record);
    writeLocalOrgNotes(notes);
    return record;
  }

  const res = await remoteFetch('/notes', ownerUid, {
    method: 'POST',
    body: JSON.stringify({
      id,
      contactId: input.contactId,
      body: input.body.trim(),
      authorName: input.authorName,
      source: input.source,
      sourceLabel: input.sourceLabel,
      timelineId: input.timelineId,
      applicationItemId: input.applicationItemId,
      recruitmentProspectId: input.recruitmentProspectId,
      createdAt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to save private note (${res.status})`);
  }
  return (await res.json()) as OrgPrivateNoteRecord;
}

export async function deleteOrgPrivateNote(
  ownerUid: string,
  noteId: string,
): Promise<void> {
  const mode = resolveMode();
  if (mode === 'none') return;

  if (mode === 'localStorage') {
    writeLocalOrgNotes(
      readLocalOrgNotes().filter(
        (n) => !(n.id === noteId && n.authorUid === ownerUid),
      ),
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
