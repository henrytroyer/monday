/**
 * privateNotesMigrate.ts — One-time migrate legacy E2E private notes → org store.
 *
 * Owner unlocks the old vault, decrypts envelopes, POSTs org notes, deletes legacy.
 */

import {
  createOrgPrivateNote,
  deleteLegacyPrivateNoteEnvelope,
  listLegacyPrivateNoteEnvelopes,
  type PrivateNoteEnvelope,
} from './privateNotesApi';
import { decryptJson, type PrivateNotePlaintext } from './privateNotesCrypto';
import {
  getPrivateNotesCryptoKey,
  isPrivateNotesVaultUnlocked,
} from './privateNotesVault';

export type PrivateNotesMigrationResult = {
  migrated: number;
  failed: number;
  skipped: number;
};

async function migrateEnvelope(
  ownerUid: string,
  envelope: PrivateNoteEnvelope,
  key: CryptoKey,
): Promise<'ok' | 'fail' | 'skip'> {
  try {
    const plain = await decryptJson<PrivateNotePlaintext>(key, {
      iv: envelope.iv,
      ciphertext: envelope.ciphertext,
    });
    if (!plain.body?.trim() || !plain.contactId?.trim()) {
      return 'skip';
    }
    await createOrgPrivateNote(ownerUid, {
      id: envelope.id,
      contactId: plain.contactId,
      body: plain.body,
      authorName: plain.authorName || 'Coordinator',
      source: plain.source || 'contact',
      sourceLabel: plain.sourceLabel || 'Contact',
      timelineId: plain.timelineId,
      applicationItemId: plain.applicationItemId,
      recruitmentProspectId: plain.recruitmentProspectId,
    });
    await deleteLegacyPrivateNoteEnvelope(ownerUid, envelope.id);
    return 'ok';
  } catch {
    return 'fail';
  }
}

/**
 * Migrate all legacy envelopes for the owner. Requires unlocked personal vault.
 */
export async function migrateLegacyPrivateNotesToOrg(
  ownerUid: string,
): Promise<PrivateNotesMigrationResult> {
  if (!isPrivateNotesVaultUnlocked()) {
    throw new Error('Unlock your old private notes vault before migrating');
  }
  const key = getPrivateNotesCryptoKey();
  if (!key) {
    throw new Error('Private notes vault is locked');
  }

  const envelopes = await listLegacyPrivateNoteEnvelopes(ownerUid);
  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  for (const envelope of envelopes) {
    const result = await migrateEnvelope(ownerUid, envelope, key);
    if (result === 'ok') migrated += 1;
    else if (result === 'fail') failed += 1;
    else skipped += 1;
  }

  return { migrated, failed, skipped };
}

export async function countLegacyPrivateNotes(
  ownerUid: string,
): Promise<number> {
  const envelopes = await listLegacyPrivateNoteEnvelopes(ownerUid);
  return envelopes.length;
}
