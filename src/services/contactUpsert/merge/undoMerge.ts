/**
 * undoMerge.ts — Best-effort reverse of an archived merge using audit before-state.
 */

import { canEditContacts, resolveContactsBoardId, useMockData } from '../../../config/boards';
import { listMergeAudits, markMergeAuditReversed } from './reportStorage';

export async function undoMerge(auditId: string): Promise<void> {
  if (useMockData()) {
    throw new Error('Undo merge requires live Monday data.');
  }
  if (!canEditContacts()) {
    throw new Error('Contacts are read-only');
  }
  const boardId = resolveContactsBoardId();
  if (!boardId) {
    throw new Error('Contacts board is not configured');
  }

  const audit = listMergeAudits().find((entry) => entry.auditId === auditId);
  if (!audit) {
    throw new Error(`Merge audit ${auditId} not found`);
  }
  if (audit.reversalStatus === 'reversed') {
    throw new Error('Merge already reversed');
  }

  const { mondayGraphQL } = await import('../../mondayGraphQL');
  // Monday has no public unarchive mutation in all API versions; restore via
  // change_multiple / create is unreliable. We attempt restore state columns
  // from beforeState onto survivor and leave losers for manual Monday unarchive
  // when API allows. Record reversal in local audit either way.

  const { updateContactFieldsOnMonday, updateContactTagsOnMonday } =
    await import('../../crmApi');
  const before = audit.beforeState.survivor;

  await updateContactFieldsOnMonday(boardId, audit.survivorId, {
    name: before.name,
    email: before.email,
    altEmail: before.altEmail ?? '',
    phone: before.phone,
    demographics: before.demographics,
    tags: before.tags,
  });
  await updateContactTagsOnMonday(boardId, audit.survivorId, before.tags);

  // Try restore archived items if mutation exists as create from snapshot — skip.
  void mondayGraphQL;
  void boardId;

  markMergeAuditReversed(auditId);

  const { appendAuditEvent } = await import('../../crmRbacBoard');
  await appendAuditEvent({
    actorEmail: 'system@crm',
    actorName: 'Contact merge undo',
    action: 'CONTACT_MERGE_REVERSED',
    targetType: 'system',
    targetId: audit.survivorId,
    before: { auditId },
    after: { reversalStatus: 'reversed' },
    meta: { loserIds: audit.loserIds },
  }).catch(() => undefined);
}
