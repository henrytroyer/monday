/**
 * classifyGroup.ts — Auto-merge vs Contact Duplicates review disposition.
 *
 * Auto only when EXACT_EMAIL + all same normalized full name, or
 * EXACT_NAME + compatible emails. Different names sharing an email → review.
 */

import type { ContactListItem } from '../../../types/contact';
import {
  allNamesRelatedForMerge,
  normalizeEmailForMerge,
  normalizeNameForMerge,
  namesEqualForMerge,
} from './normalize';
import { pickSurvivor } from './survivorScore';
import type {
  ClassifiedDuplicateGroup,
  DuplicateGroupCandidate,
  MergeOpsConfig,
  MergeReviewReason,
} from './types';
import { DEFAULT_MERGE_OPS_CONFIG } from './types';

function allSameNormalizedName(contacts: ContactListItem[]): boolean {
  const names = contacts
    .map((c) => normalizeNameForMerge(c.name))
    .filter((n): n is string => Boolean(n));
  if (names.length !== contacts.length) return false;
  return names.every((n) => n === names[0]);
}

function emailsCompatibleForExactName(contacts: ContactListItem[]): boolean {
  const emails = contacts
    .map((c) => normalizeEmailForMerge(c.email))
    .filter((e): e is string => Boolean(e));
  if (emails.length === 0) return true;
  const unique = new Set(emails);
  return unique.size === 1;
}

function hasDifferentNames(contacts: ContactListItem[]): boolean {
  const names = new Set(
    contacts
      .map((c) => normalizeNameForMerge(c.name))
      .filter((n): n is string => Boolean(n)),
  );
  return names.size > 1;
}

export function classifyDuplicateGroup(
  candidate: DuplicateGroupCandidate,
  config: MergeOpsConfig = DEFAULT_MERGE_OPS_CONFIG,
  lockedIds: Set<string> = new Set(),
): ClassifiedDuplicateGroup {
  const { survivor, breakdown } = pickSurvivor(candidate.contacts);
  const losers = candidate.contacts.filter((c) => c.id !== survivor.id);
  const reviewReasons: MergeReviewReason[] = [];

  if (candidate.contacts.some((c) => lockedIds.has(c.id))) {
    reviewReasons.push('LOCKED');
  }

  if (candidate.contacts.length > config.maxGroupSize) {
    reviewReasons.push('OVERSIZE_GROUP');
  }

  const hasExactEmail = candidate.reasons.includes('EXACT_EMAIL');
  const hasExactName = candidate.reasons.includes('EXACT_NAME');

  if (hasExactEmail && hasDifferentNames(candidate.contacts)) {
    // Same email + totally unrelated names (e.g. Clarence and Erla vs Kristalyn
    // Martin) → ignore; shared surname/household variants still go to review.
    if (!allNamesRelatedForMerge(candidate.contacts)) {
      reviewReasons.push('UNRELATED_NAMES');
      return {
        ...candidate,
        scoreBreakdown: breakdown,
        suggestedSurvivorId: survivor.id,
        disposition: 'ignore',
        reviewReasons,
        survivor,
        losers,
      };
    }
    reviewReasons.push('EXACT_EMAIL_DIFF_NAME');
  }

  if (hasExactName && !emailsCompatibleForExactName(candidate.contacts)) {
    reviewReasons.push('EXACT_NAME_EMAIL_CONFLICT');
  }

  // Auto only: exact email + identical names, OR exact name + compatible emails,
  // and no review reasons.
  let canAuto = false;
  if (reviewReasons.length === 0) {
    if (hasExactEmail && allSameNormalizedName(candidate.contacts)) {
      canAuto = true;
    } else if (
      hasExactName &&
      allSameNormalizedName(candidate.contacts) &&
      emailsCompatibleForExactName(candidate.contacts)
    ) {
      canAuto = true;
    } else if (!hasExactEmail && !hasExactName) {
      reviewReasons.push('SIMILAR_NAME_ONLY');
    } else if (hasExactEmail && !allSameNormalizedName(candidate.contacts)) {
      // Already covered by EXACT_EMAIL_DIFF_NAME; keep review.
    } else if (hasExactName && hasDifferentNames(candidate.contacts)) {
      reviewReasons.push('SIMILAR_NAME_ONLY');
    }
  }

  // If only EXACT_NAME with same name but we somehow lack email compatibility flag
  if (
    canAuto === false &&
    reviewReasons.length === 0 &&
    hasExactName &&
    allSameNormalizedName(candidate.contacts) &&
    emailsCompatibleForExactName(candidate.contacts)
  ) {
    canAuto = true;
  }

  if (!canAuto && reviewReasons.length === 0) {
    reviewReasons.push('HARD_CONFLICT');
  }

  return {
    ...candidate,
    scoreBreakdown: breakdown,
    suggestedSurvivorId: survivor.id,
    disposition: canAuto ? 'auto' : 'review',
    reviewReasons,
    survivor,
    losers,
  };
}

export function classifyAllGroups(
  candidates: DuplicateGroupCandidate[],
  config: MergeOpsConfig = DEFAULT_MERGE_OPS_CONFIG,
  lockedIds: Set<string> = new Set(),
): ClassifiedDuplicateGroup[] {
  return candidates.map((c) => classifyDuplicateGroup(c, config, lockedIds));
}

/** True when two display names are exact-equal after normalize. */
export function isExactNamePair(a: string, b: string): boolean {
  return namesEqualForMerge(a, b);
}
