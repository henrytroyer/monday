/**
 * privateContactNotes.ts — Org-confidential private contact hub notes.
 *
 * Bodies are encrypted by the private-notes store (Cloud Function / proxy).
 * Authors can write/delete their own; higher Admin roles can read only.
 * Owner dual-reads unmigrated legacy E2E envelopes when the old vault is unlocked.
 */

import type {
  ContactInternalNote,
  ContactInternalNoteTarget,
} from '../types/contact';
import {
  createOrgPrivateNote,
  isPrivateNotesStoreAvailable,
  listLegacyPrivateNoteEnvelopes,
  listOrgPrivateNotes,
  type OrgPrivateNoteRecord,
} from './privateNotesApi';
import { decryptJson, type PrivateNotePlaintext } from './privateNotesCrypto';
import {
  getPrivateNotesCryptoKey,
  isPrivateNotesVaultUnlocked,
} from './privateNotesVault';

function plaintextFieldsFromTarget(target: ContactInternalNoteTarget): {
  source: ContactInternalNote['source'];
  sourceLabel: string;
  timelineId?: string;
  applicationItemId?: string;
  recruitmentProspectId?: string;
} {
  if (target.kind === 'recruitment') {
    return {
      source: 'recruitment',
      sourceLabel: target.sourceLabel,
      recruitmentProspectId: target.prospectId,
    };
  }
  if (target.kind === 'term') {
    return {
      source: 'term',
      sourceLabel: target.sourceLabel,
      timelineId: target.timelineId,
      applicationItemId: target.itemId,
    };
  }
  return {
    source: 'contact',
    sourceLabel: target.sourceLabel,
  };
}

function toContactNote(record: OrgPrivateNoteRecord): ContactInternalNote {
  return {
    id: record.id,
    body: record.body,
    createdAt: record.createdAt,
    authorName: record.authorName,
    source: record.source,
    sourceLabel: record.sourceLabel,
    timelineId: record.timelineId,
    applicationItemId: record.applicationItemId,
    recruitmentProspectId: record.recruitmentProspectId,
    mondayItemId: '',
    visibility: 'private',
    ownerUid: record.authorUid,
    authorRole: record.authorRole,
    canEdit: record.canEdit,
  };
}

async function fetchOwnerLegacyNotes(
  ownerUid: string,
  contactId: string,
): Promise<{ notes: ContactInternalNote[]; lockedCount: number }> {
  const envelopes = await listLegacyPrivateNoteEnvelopes(ownerUid, contactId);
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
      if (!plain.body?.trim()) {
        lockedCount += 1;
        continue;
      }
      notes.push({
        id: envelope.id,
        body: plain.body,
        createdAt: envelope.createdAt,
        authorName: plain.authorName || 'Coordinator',
        source: plain.source || 'contact',
        sourceLabel: plain.sourceLabel || 'Contact',
        timelineId: plain.timelineId,
        applicationItemId: plain.applicationItemId,
        recruitmentProspectId: plain.recruitmentProspectId,
        mondayItemId: '',
        visibility: 'private',
        ownerUid,
        canEdit: true,
      });
    } catch {
      lockedCount += 1;
    }
  }
  return { notes, lockedCount };
}

export async function fetchDecryptedPrivateContactNotes(
  ownerUid: string,
  contactId: string,
): Promise<{
  notes: ContactInternalNote[];
  lockedCount: number;
}> {
  if (!isPrivateNotesStoreAvailable() || !ownerUid) {
    return { notes: [], lockedCount: 0 };
  }
  const records = await listOrgPrivateNotes(ownerUid, contactId);
  const orgNotes = records.map(toContactNote);
  const orgIds = new Set(orgNotes.map((n) => n.id));
  const legacy = await fetchOwnerLegacyNotes(ownerUid, contactId);
  const legacyOnly = legacy.notes.filter((n) => !orgIds.has(n.id));
  return {
    notes: [...orgNotes, ...legacyOnly],
    lockedCount: legacy.lockedCount,
  };
}

export async function addPrivateContactNote(options: {
  ownerUid: string;
  contactId: string;
  body: string;
  target: ContactInternalNoteTarget;
  authorName: string;
}): Promise<ContactInternalNote> {
  if (!isPrivateNotesStoreAvailable()) {
    throw new Error('Private notes store is not available');
  }
  const fields = plaintextFieldsFromTarget(options.target);
  const record = await createOrgPrivateNote(options.ownerUid, {
    contactId: options.contactId,
    body: options.body.trim(),
    authorName: options.authorName,
    ...fields,
  });
  return toContactNote(record);
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
