/**
 * contactBoardDedupe.ts — Compatibility facade over the shared merge engine.
 * Prefer importing from `./merge` for new code.
 */

import type { ContactListItem, ContactTag } from '../../types/contact';
import { isCompiledContactId } from '../compileContactsFromBoards';
import {
  buildFieldMergePlan,
  combineEmails,
  executeMerge,
  findConnectedVolunteers,
  findDuplicateGroupCandidates,
  looksLikeCoupleName,
  pickParentSource,
  pickPastorSource,
  pickRichestName,
  pickSurvivor as pickSurvivorEngine,
  contactInfoScoreCompat,
} from './merge/compat';
import type { FieldMergeOverrides } from './merge/types';

export interface ContactDuplicateGroup {
  key: string;
  contacts: ContactListItem[];
  suggestedSurvivorId: string;
}

export interface MergeContactsPreview {
  survivorId: string;
  loserIds: string[];
  resultingName: string;
  resultingEmail: string;
  resultingAltEmail?: string;
  resultingTags: ContactTag[];
  namesDiffer: boolean;
  connectedVolunteerNames: string[];
  willUpdatePastor: boolean;
  willUpdateParents: boolean;
}

export interface MergeContactsResult {
  survivorId: string;
  deletedIds: string[];
  resultingTags: ContactTag[];
  resultingEmail: string;
  resultingAltEmail?: string;
  updatedVolunteerIds: string[];
}

export interface MergeContactsOptions {
  allContacts?: ContactListItem[];
  source?: 'MANUAL' | 'DAILY_JOB';
  actorEmail?: string;
  actorName?: string;
  dryRun?: boolean;
  /** Reviewer keep/delete field choices from the merge confirm UI. */
  fieldOverrides?: FieldMergeOverrides;
}

export {
  looksLikeCoupleName,
  combineEmails,
  pickRichestName,
  pickPastorSource,
  pickParentSource,
  findConnectedVolunteers,
};

export const contactInfoScore = contactInfoScoreCompat;

export function pickSurvivor(contacts: ContactListItem[]): ContactListItem {
  return pickSurvivorEngine(contacts).survivor;
}

export function findEmailDuplicateGroups(
  contacts: ContactListItem[],
): ContactDuplicateGroup[] {
  return findDuplicateGroupCandidates(contacts)
    .filter((g) => g.reasons.includes('EXACT_EMAIL'))
    .map((g) => ({
      key: g.key.replace(/^email:/, ''),
      contacts: g.contacts,
      suggestedSurvivorId: g.suggestedSurvivorId,
    }));
}

export function previewMergeContacts(
  survivor: ContactListItem,
  losers: ContactListItem[],
  options?: MergeContactsOptions,
): MergeContactsPreview {
  const plan = buildFieldMergePlan(
    survivor,
    losers,
    options?.allContacts ?? [],
  );
  return {
    survivorId: survivor.id,
    loserIds: losers.map((l) => l.id),
    resultingName: plan.resultingName,
    resultingEmail: plan.resultingEmail,
    resultingAltEmail: plan.resultingAltEmail,
    resultingTags: plan.resultingTags,
    namesDiffer: plan.namesDiffer,
    connectedVolunteerNames: plan.connectedVolunteerNames,
    willUpdatePastor: plan.willUpdatePastor,
    willUpdateParents: plan.willUpdateParents,
  };
}

/**
 * Merge losers into survivor via shared engine (archives losers — no hard delete).
 */
export async function mergeContacts(
  survivor: ContactListItem,
  losers: ContactListItem[],
  options?: MergeContactsOptions,
): Promise<MergeContactsResult> {
  if (isCompiledContactId(survivor.id)) {
    throw new Error(
      'Cannot merge into a compiled-only contact. Open a real Contacts board item.',
    );
  }
  const result = await executeMerge(survivor, losers, {
    allContacts: options?.allContacts,
    source: options?.source ?? 'MANUAL',
    actorEmail: options?.actorEmail,
    actorName: options?.actorName,
    dryRun: options?.dryRun,
    fieldOverrides: options?.fieldOverrides,
  });
  return {
    survivorId: result.survivorId,
    deletedIds: result.archivedIds,
    resultingTags: result.resultingTags,
    resultingEmail: result.resultingEmail,
    resultingAltEmail: result.resultingAltEmail,
    updatedVolunteerIds: result.updatedVolunteerIds,
  };
}
