/**
 * compat.ts — Back-compat helpers for contactBoardDedupe facade.
 */

import type { ContactListItem } from '../../../types/contact';
import { scoreContact } from './survivorScore';

export { combineEmails, buildFieldMergePlan, findConnectedVolunteers } from './fieldMergePlan';
export {
  looksLikeCoupleName,
  pickRichestName,
  pickPastorSource,
  pickParentSource,
  pickSurvivor,
} from './survivorScore';
export { findDuplicateGroupCandidates } from './groupDuplicates';
export { executeMerge } from './executeMerge';

export function contactInfoScoreCompat(contact: ContactListItem): number {
  return scoreContact(contact).total;
}
