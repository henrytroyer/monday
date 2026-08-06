/**
 * relationPlan.ts — Plan board_relation unions from losers onto survivor.
 * Actual linked ids are supplied by the caller (from Monday column reads).
 */

import { contactMap } from '../../../config/contactMap';
import type { RelationMergePlan } from './types';

export const MERGE_RELATION_COLUMNS: Array<{
  key: keyof typeof contactMap;
  title: string;
}> = [
  { key: 'applicationsLink', title: contactMap.applicationsLink },
  { key: 'longtermApplicationsLink', title: contactMap.longtermApplicationsLink },
  { key: 'serviceEndedLink', title: contactMap.serviceEndedLink },
  { key: 'donationsLink', title: contactMap.donationsLink },
  { key: 'pastorReferenceLink', title: contactMap.pastorReferenceLink },
  { key: 'safeguardingLink', title: contactMap.safeguardingLink },
];

export function planRelationUnion(
  columnTitle: string,
  survivorIds: string[],
  loserIdLists: string[][],
): RelationMergePlan {
  const merged = new Set(survivorIds.map(String).filter(Boolean));
  const added: string[] = [];
  for (const list of loserIdLists) {
    for (const id of list) {
      const sid = String(id);
      if (!sid || merged.has(sid)) continue;
      merged.add(sid);
      added.push(sid);
    }
  }
  return {
    columnTitle,
    survivorLinkedIds: [...merged],
    addedIds: added,
  };
}

export function planAllRelationUnions(
  relationSnapshots: Array<{
    columnTitle: string;
    survivorIds: string[];
    loserIdLists: string[][];
  }>,
): RelationMergePlan[] {
  return relationSnapshots
    .map((entry) =>
      planRelationUnion(
        entry.columnTitle,
        entry.survivorIds,
        entry.loserIdLists,
      ),
    )
    .filter((plan) => plan.addedIds.length > 0 || plan.survivorLinkedIds.length > 0);
}
