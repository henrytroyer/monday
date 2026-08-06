/**
 * privateContactNotes.ts — Encrypt/decrypt private contact hub notes (no Monday).
 */

import type {
  ContactInternalNote,
  ContactInternalNoteTarget,
} from '../types/contact';
import {
  createPrivateNoteEnvelope,
  listPrivateNoteEnvelopes,
  type PrivateNoteEnvelope,
} from './privateNotesApi';
import {
  decryptJson,
  encryptJson,
  PRIVATE_NOTES_ALG,
  type PrivateNotePlaintext,
} from './privateNotesCrypto';
import {
  getPrivateNotesCryptoKey,
  isPrivateNotesVaultUnlocked,
} from './privateNotesVault';

function newNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function plaintextFromTarget(
  target: ContactInternalNoteTarget,
  body: string,
  contactId: string,
  authorName: string,
  createdAt: string,
): PrivateNotePlaintext {
  if (target.kind === 'recruitment') {
    return {
      body,
      contactId,
      authorName,
      createdAt,
      source: 'recruitment',
      sourceLabel: target.sourceLabel,
      recruitmentProspectId: target.prospectId,
    };
  }
  if (target.kind === 'term') {
    return {
      body,
      contactId,
      authorName,
      createdAt,
      source: 'term',
      sourceLabel: target.sourceLabel,
      timelineId: target.timelineId,
      applicationItemId: target.itemId,
    };
  }
  return {
    body,
    contactId,
    authorName,
    createdAt,
    source: 'contact',
    sourceLabel: target.sourceLabel,
  };
}

function toContactNote(
  envelope: PrivateNoteEnvelope,
  plain: PrivateNotePlaintext,
): ContactInternalNote {
  return {
    id: envelope.id,
    body: plain.body,
    createdAt: plain.createdAt || envelope.createdAt,
    authorName: plain.authorName,
    source: plain.source,
    sourceLabel: plain.sourceLabel,
    timelineId: plain.timelineId,
    applicationItemId: plain.applicationItemId,
    recruitmentProspectId: plain.recruitmentProspectId,
    mondayItemId: '',
    visibility: 'private',
    ownerUid: envelope.ownerUid,
  };
}

export async function fetchDecryptedPrivateContactNotes(
  ownerUid: string,
  contactId: string,
): Promise<{
  notes: ContactInternalNote[];
  lockedCount: number;
}> {
  const envelopes = await listPrivateNoteEnvelopes(ownerUid, contactId);
  if (envelopes.length === 0) {
    return { notes: [], lockedCount: 0 };
  }

  if (!isPrivateNotesVaultUnlocked()) {
    return { notes: [], lockedCount: envelopes.length };
  }

  const key = getPrivateNotesCryptoKey();
  if (!key) {
    return { notes: [], lockedCount: envelopes.length };
  }

  const notes: ContactInternalNote[] = [];
  let lockedCount = 0;
  for (const envelope of envelopes) {
    try {
      const plain = await decryptJson<PrivateNotePlaintext>(key, {
        iv: envelope.iv,
        ciphertext: envelope.ciphertext,
      });
      notes.push(toContactNote(envelope, plain));
    } catch {
      lockedCount += 1;
    }
  }
  return { notes, lockedCount };
}

export async function addPrivateContactNote(options: {
  ownerUid: string;
  contactId: string;
  body: string;
  target: ContactInternalNoteTarget;
  authorName: string;
}): Promise<ContactInternalNote> {
  if (!isPrivateNotesVaultUnlocked()) {
    throw new Error('Unlock private notes before adding a private note');
  }
  const key = getPrivateNotesCryptoKey();
  if (!key) {
    throw new Error('Private notes vault is locked');
  }

  const createdAt = new Date().toISOString();
  const plain = plaintextFromTarget(
    options.target,
    options.body.trim(),
    options.contactId,
    options.authorName,
    createdAt,
  );
  const cipher = await encryptJson(key, plain);
  const envelope: PrivateNoteEnvelope = {
    id: newNoteId(),
    ownerUid: options.ownerUid,
    contactId: options.contactId,
    createdAt,
    alg: PRIVATE_NOTES_ALG,
    iv: cipher.iv,
    ciphertext: cipher.ciphertext,
  };
  await createPrivateNoteEnvelope(options.ownerUid, envelope);
  return toContactNote(envelope, plain);
}

export function mergeContactNotes(
  publicNotes: ContactInternalNote[],
  privateNotes: ContactInternalNote[],
): ContactInternalNote[] {
  const taggedPublic = publicNotes.map((note) =>
    note.visibility
      ? note
      : { ...note, visibility: 'public' as const },
  );
  return [...taggedPublic, ...privateNotes].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}
