/**
 * Rules for which monday updates must not enter note harvest / Internal Notes.
 * Email correspondence (SuperMail) and automation authors belong elsewhere.
 */

import {
  isContactHubNoteUpdate,
  isRecruitmentNoteUpdate,
} from './contactInternalNotes';
import { isNoteReviewRegistryUpdate } from './noteReviewRegistryFormat';
import { isSuperMailUpdate } from './parseSuperMailUpdate';
import { isTermNoteUpdate } from './termNotes';

export function isAutomationNoteAuthor(authorName?: string | null): boolean {
  if (!authorName?.trim()) return false;
  return authorName.trim().toLowerCase() === 'automation';
}

/** CRM-tagged notes, email logs, and automation authors are not harvest candidates. */
export function shouldSkipNoteHarvest(
  body: string,
  authorName?: string | null,
): boolean {
  if (isAutomationNoteAuthor(authorName)) return true;
  if (isSuperMailUpdate(body)) return true;
  return (
    isTermNoteUpdate(body) ||
    isRecruitmentNoteUpdate(body) ||
    isContactHubNoteUpdate(body) ||
    isNoteReviewRegistryUpdate(body)
  );
}
