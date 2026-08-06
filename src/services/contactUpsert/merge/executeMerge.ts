/**
 * executeMerge.ts — Shared merge transaction-equivalent for CRM + daily job.
 * Archives losers (never hard-deletes). On failure, does not archive.
 *
 * Quiet Monday writes: mutations have no create_notifications:false flag.
 * Merge uses (1) temporary board MUTE_ALL when the token is admin (API 2025-10),
 * (2) change_multiple_column_values batches, (3) no create_update. For full
 * silence if mute fails: board ⋯ → Notifications → Mute for everyone, and turn
 * off Automations that notify on archive / column change.
 */

import {
  canEditContacts,
  resolveContactsBoardId,
  useMockData,
} from '../../../config/boards';
import { contactMap } from '../../../config/contactMap';
import type { ContactListItem } from '../../../types/contact';
import { isCompiledContactId } from '../../compileContactsFromBoards';
import { writeBoardRelationsByTitle } from '../../boardRelationWrite';
import { withBoardNotificationsMuted } from '../../mondayBoardMute';
import { applyFieldMergeOverrides } from './fieldMergeChoices';
import {
  buildFieldMergePlan,
  buildIdempotencyKey,
  findConnectedVolunteers,
  pickParentSource,
  pickPastorSource,
} from './fieldMergePlan';
import {
  acquireMergeLock,
  releaseMergeLock,
} from './locks';
import {
  normalizeEmailForMerge,
  normalizeNameForMerge,
} from './normalize';
import { MERGE_RELATION_COLUMNS, planRelationUnion } from './relationPlan';
import {
  findMergeAuditByIdempotency,
  saveMergeAudit,
} from './reportStorage';
import type {
  FieldMergeOverrides,
  MergeAuditRecord,
  MergeSource,
  RelationMergePlan,
} from './types';

export interface ExecuteMergeOptions {
  allContacts?: ContactListItem[];
  source?: MergeSource;
  actorEmail?: string;
  actorName?: string;
  jobRunId?: string;
  dryRun?: boolean;
  /** Preloaded relation snapshots: columnTitle → itemId → linked ids */
  relationSnapshots?: Record<string, Record<string, string[]>>;
  /** Reviewer keep/delete choices; omitted keys keep engine defaults. */
  fieldOverrides?: FieldMergeOverrides;
}

export interface ExecuteMergeResult {
  survivorId: string;
  archivedIds: string[];
  resultingTags: ContactListItem['tags'];
  resultingEmail: string;
  resultingAltEmail?: string;
  updatedVolunteerIds: string[];
  auditId: string;
  fieldConflicts: MergeAuditRecord['fieldConflicts'];
  skipped?: boolean;
  skipReason?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function archiveMondayItems(itemIds: string[]): Promise<void> {
  const { mondayGraphQL } = await import('../../mondayGraphQL');
  const { mutations } = await import('../../../utils/mondayQueries');
  for (const itemId of itemIds) {
    await mondayGraphQL(mutations.archiveItem, { itemId });
    await sleep(80);
  }
}

export async function executeMerge(
  survivor: ContactListItem,
  losers: ContactListItem[],
  options: ExecuteMergeOptions = {},
): Promise<ExecuteMergeResult> {
  if (losers.length === 0) {
    throw new Error('Nothing to merge');
  }
  if (isCompiledContactId(survivor.id)) {
    throw new Error(
      'Cannot merge into a compiled-only contact. Open a real Contacts board item.',
    );
  }
  for (const loser of losers) {
    if (isCompiledContactId(loser.id)) {
      throw new Error(
        `Cannot merge compiled contact "${loser.name}". Select real Contacts board items.`,
      );
    }
  }

  const idempotencyKey = buildIdempotencyKey(
    survivor.id,
    losers.map((l) => l.id),
    ['MANUAL'],
  );
  const existingAudit = findMergeAuditByIdempotency(idempotencyKey);
  if (existingAudit) {
    return {
      survivorId: existingAudit.survivorId,
      archivedIds: existingAudit.loserIds,
      resultingTags: existingAudit.tagsAdded,
      resultingEmail: survivor.email,
      auditId: existingAudit.auditId,
      fieldConflicts: existingAudit.fieldConflicts,
      updatedVolunteerIds: [],
      skipped: true,
      skipReason: 'idempotent_replay',
    };
  }

  const lockHolder = `merge-${survivor.id}-${Date.now()}`;
  const locked = acquireMergeLock(
    [survivor.id, ...losers.map((l) => l.id)],
    lockHolder,
  );
  if (!locked) {
    throw new Error('Contacts are locked by another merge in progress');
  }

  try {
    if (options.dryRun) {
      const fieldPlan = applyFieldMergeOverrides(
        buildFieldMergePlan(survivor, losers, options.allContacts ?? []),
        options.fieldOverrides,
        [survivor, ...losers],
      );
      return {
        survivorId: survivor.id,
        archivedIds: losers.map((l) => l.id),
        resultingTags: fieldPlan.resultingTags,
        resultingEmail: fieldPlan.resultingEmail,
        resultingAltEmail: fieldPlan.resultingAltEmail,
        updatedVolunteerIds: [],
        auditId: `dry-${idempotencyKey}`,
        fieldConflicts: fieldPlan.conflicts,
      };
    }

    if (useMockData()) {
      throw new Error('Contact merge requires live Monday data.');
    }
    if (!canEditContacts()) {
      throw new Error('Contacts are read-only');
    }
    const boardId = resolveContactsBoardId();
    if (!boardId) {
      throw new Error('Contacts board is not configured');
    }

    const {
      updateContactFieldsOnMonday,
      updateContactPastorReferenceOnMonday,
    } = await import('../../crmApi');
    const { changeMultipleColumnsByTitle } = await import(
      '../../mondayColumnWrite'
    );
    const { appendAuditEvent } = await import('../../crmRbacBoard');

    const mergeContacts = [survivor, ...losers];
    const fieldPlan = applyFieldMergeOverrides(
      buildFieldMergePlan(survivor, losers, options.allContacts ?? []),
      options.fieldOverrides,
      mergeContacts,
    );

    return withBoardNotificationsMuted(boardId, async () => {
      await updateContactFieldsOnMonday(
        boardId,
        survivor.id,
        {
          name: fieldPlan.resultingName,
          email: fieldPlan.resultingEmail,
          altEmail: fieldPlan.resultingAltEmail ?? '',
          phone: fieldPlan.phone,
          demographics: fieldPlan.demographics,
          tags: fieldPlan.resultingTags,
        },
        { quiet: true },
      );

      const survivorExtras: Array<{ columnTitle: string; rawValue: string }> =
        [];
      if (fieldPlan.connectedTo) {
        survivorExtras.push({
          columnTitle: contactMap.connectedTo,
          rawValue: fieldPlan.connectedTo,
        });
      }
      if (fieldPlan.spouseName) {
        survivorExtras.push({
          columnTitle: contactMap.spouseName,
          rawValue: fieldPlan.spouseName,
        });
      }
      if (survivorExtras.length > 0) {
        await changeMultipleColumnsByTitle(
          boardId,
          survivor.id,
          survivorExtras,
        ).catch(() => undefined);
      }

      const relationPlans: RelationMergePlan[] = [];
      const relationWrites: Array<{
        columnTitle: string;
        itemIds: string[];
      }> = [];
      if (options.relationSnapshots) {
        for (const { title } of MERGE_RELATION_COLUMNS) {
          const byItem = options.relationSnapshots[title] ?? {};
          const survivorIds = byItem[survivor.id] ?? [];
          const loserLists = losers.map((l) => byItem[l.id] ?? []);
          const plan = planRelationUnion(title, survivorIds, loserLists);
          if (plan.addedIds.length > 0) {
            relationWrites.push({
              columnTitle: title,
              itemIds: plan.survivorLinkedIds,
            });
            relationPlans.push(plan);
          }
        }
      }
      if (relationWrites.length > 0) {
        await writeBoardRelationsByTitle(
          boardId,
          survivor.id,
          relationWrites,
        ).catch(() => undefined);
      }

      const volunteers = findConnectedVolunteers(
        mergeContacts,
        options.allContacts ?? [],
      );
      const overridePastor = options.fieldOverrides?.pastorSourceId
        ? mergeContacts.find(
            (c) =>
              c.id === options.fieldOverrides?.pastorSourceId &&
              c.tags.includes('pastor'),
          )
        : null;
      const overrideParent = options.fieldOverrides?.parentSourceId
        ? mergeContacts.find(
            (c) =>
              c.id === options.fieldOverrides?.parentSourceId &&
              c.tags.includes('parent'),
          )
        : null;
      const pastorSource = fieldPlan.willUpdatePastor
        ? (overridePastor ?? pickPastorSource(mergeContacts))
        : null;
      const parentSource = fieldPlan.willUpdateParents
        ? (overrideParent ?? pickParentSource(mergeContacts))
        : null;
      const updatedVolunteerIds: string[] = [];

      for (const volunteer of volunteers) {
        let touched = false;
        if (pastorSource) {
          await updateContactPastorReferenceOnMonday(
            boardId,
            volunteer.id,
            {
              name: pastorSource.name,
              email:
                normalizeEmailForMerge(pastorSource.email) ||
                pastorSource.email,
              phone: pastorSource.phone,
            },
            { quiet: true },
          ).catch(() => undefined);
          touched = true;
        }
        if (parentSource) {
          const parentUpdates: Array<{
            columnTitle: string;
            rawValue: string;
          }> = [];
          if (parentSource.name.trim()) {
            parentUpdates.push({
              columnTitle: contactMap.parentName,
              rawValue: parentSource.name.trim(),
            });
          }
          const parentEmail =
            normalizeEmailForMerge(parentSource.email) ||
            parentSource.email?.trim();
          if (parentEmail && parentEmail !== '—') {
            parentUpdates.push({
              columnTitle: contactMap.parentEmail,
              rawValue: parentEmail,
            });
          }
          if (parentSource.phone?.trim()) {
            parentUpdates.push({
              columnTitle: contactMap.parentPhone,
              rawValue: parentSource.phone.trim(),
            });
          }
          if (parentUpdates.length > 0) {
            await changeMultipleColumnsByTitle(
              boardId,
              volunteer.id,
              parentUpdates,
            ).catch(() => undefined);
            touched = true;
          }
        }
        if (touched) updatedVolunteerIds.push(volunteer.id);
      }

      const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const audit: MergeAuditRecord = {
        auditId,
        jobRunId: options.jobRunId,
        survivorId: survivor.id,
        loserIds: losers.map((l) => l.id),
        reasons: ['EXACT_EMAIL'],
        normalizedEmail: normalizeEmailForMerge(fieldPlan.resultingEmail),
        normalizedName: normalizeNameForMerge(fieldPlan.resultingName),
        scoreBreakdown: [],
        fieldsCopied: [
          'name',
          'email',
          'altEmail',
          'phone',
          'tags',
          'connectedTo',
          'demographics',
        ],
        fieldConflicts: fieldPlan.conflicts,
        tagsAdded: fieldPlan.resultingTags,
        relationsReassigned: relationPlans,
        beforeState: { survivor, losers },
        source: options.source ?? 'MANUAL',
        actorEmail: options.actorEmail,
        actorName: options.actorName,
        timestamp: new Date().toISOString(),
        result: 'success',
        reversalStatus: 'none',
        idempotencyKey,
      };

      saveMergeAudit(audit);
      await appendAuditEvent({
        actorEmail: options.actorEmail ?? 'system@crm',
        actorName: options.actorName ?? 'Contact merge',
        action: 'CONTACT_MERGE',
        targetType: 'system',
        targetId: survivor.id,
        before: { losers: losers.map((l) => l.id) },
        after: {
          survivorId: survivor.id,
          archivedIds: losers.map((l) => l.id),
          auditId,
          oldestCreatedAt: fieldPlan.oldestCreatedAt,
        },
        meta: {
          idempotencyKey,
          fieldConflicts: fieldPlan.conflicts,
          resultingName: fieldPlan.resultingName,
        },
      }).catch(() => undefined);

      await archiveMondayItems(losers.map((l) => l.id));

      return {
        survivorId: survivor.id,
        archivedIds: losers.map((l) => l.id),
        resultingTags: fieldPlan.resultingTags,
        resultingEmail: fieldPlan.resultingEmail,
        resultingAltEmail: fieldPlan.resultingAltEmail,
        updatedVolunteerIds,
        auditId,
        fieldConflicts: fieldPlan.conflicts,
      };
    });
  } finally {
    releaseMergeLock(lockHolder);
  }
}
