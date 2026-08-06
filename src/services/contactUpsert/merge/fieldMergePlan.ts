/**
 * fieldMergePlan.ts — Field merge decisions: fill-gap, tag union, conflict log.
 */

import type { ContactListItem } from '../../../types/contact';
import { mergeTags } from '../../contactSyncHelpers';
import {
  normalizeEmailForMerge,
  normalizeNameForMerge,
} from './normalize';
import {
  looksLikeCoupleName,
  pickParentSource,
  pickPastorSource,
  pickRichestName,
} from './survivorScore';
import type { FieldMergePlan, MergeFieldConflict } from './types';

function fillGap(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const e = existing?.trim();
  const i = incoming?.trim();
  if (e) return e;
  if (i) return i;
  return undefined;
}

function splitAltEmails(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;]/)
    .map((part) => normalizeEmailForMerge(part))
    .filter((email): email is string => Boolean(email));
}

export function combineEmails(
  survivor: ContactListItem,
  losers: ContactListItem[],
): { primary: string; altEmail?: string } {
  const primary =
    normalizeEmailForMerge(survivor.email) ||
    losers.map((c) => normalizeEmailForMerge(c.email)).find(Boolean) ||
    survivor.email;

  const extras = new Set<string>();
  for (const email of splitAltEmails(survivor.altEmail)) {
    if (email !== primary) extras.add(email);
  }
  for (const loser of losers) {
    const loserPrimary = normalizeEmailForMerge(loser.email);
    if (loserPrimary && loserPrimary !== primary) extras.add(loserPrimary);
    for (const email of splitAltEmails(loser.altEmail)) {
      if (email !== primary) extras.add(email);
    }
  }

  const altList = [...extras];
  return {
    primary: primary || survivor.email || '—',
    altEmail: altList.length > 0 ? altList.join(', ') : undefined,
  };
}

function recordConflict(
  conflicts: MergeFieldConflict[],
  field: string,
  survivorValue: string | undefined,
  loser: ContactListItem,
  loserValue: string | undefined,
): void {
  const s = survivorValue?.trim();
  const l = loserValue?.trim();
  if (!s || !l) return;
  if (s === l) return;
  conflicts.push({
    field,
    survivorValue: s,
    loserValue: l,
    loserId: loser.id,
  });
}

function extractConnectedVolunteerNames(
  mergeContacts: ContactListItem[],
): string[] {
  const selfNames = new Set(
    mergeContacts
      .map((c) => normalizeNameForMerge(c.name))
      .filter((n): n is string => Boolean(n)),
  );
  const found: string[] = [];
  for (const contact of mergeContacts) {
    for (const part of (contact.connectedTo ?? '').split(/[,;]/)) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (/^couple:\s*/i.test(trimmed)) continue;
      if (/^parent of\s+/i.test(trimmed) || /^pastor for\s+/i.test(trimmed)) {
        continue;
      }
      const norm = normalizeNameForMerge(trimmed);
      if (!norm || selfNames.has(norm)) continue;
      found.push(trimmed);
    }
  }
  return [...new Set(found)];
}

export function findConnectedVolunteers(
  mergeContacts: ContactListItem[],
  allContacts: ContactListItem[],
): ContactListItem[] {
  if (allContacts.length === 0) return [];
  const mergeIds = new Set(mergeContacts.map((c) => c.id));
  const named = new Set(
    extractConnectedVolunteerNames(mergeContacts)
      .map((n) => normalizeNameForMerge(n))
      .filter((n): n is string => Boolean(n)),
  );
  const mergeNormNames = [
    ...new Set(
      mergeContacts
        .map((c) => normalizeNameForMerge(c.name))
        .filter((n): n is string => Boolean(n)),
    ),
  ];

  return allContacts.filter((candidate) => {
    if (mergeIds.has(candidate.id)) return false;
    const candidateNorm = normalizeNameForMerge(candidate.name);
    if (candidateNorm && named.has(candidateNorm)) return true;
    const connected = candidate.connectedTo ?? '';
    if (connected) {
      for (const mergeName of mergeNormNames) {
        if (
          connected
            .split(/[,;]/)
            .some((part) => normalizeNameForMerge(part) === mergeName)
        ) {
          return true;
        }
      }
    }
    return false;
  });
}

export function buildFieldMergePlan(
  survivor: ContactListItem,
  losers: ContactListItem[],
  allContacts: ContactListItem[] = [],
): FieldMergePlan {
  const all = [survivor, ...losers];
  const emails = combineEmails(survivor, losers);
  let tags = [...survivor.tags];
  for (const loser of losers) {
    tags = mergeTags(tags, loser.tags);
  }

  const conflicts: MergeFieldConflict[] = [];
  for (const loser of losers) {
    recordConflict(conflicts, 'phone', survivor.phone, loser, loser.phone);
    recordConflict(
      conflicts,
      'spouseName',
      survivor.spouseName,
      loser,
      loser.spouseName,
    );
    recordConflict(
      conflicts,
      'address',
      survivor.demographics?.address,
      loser,
      loser.demographics?.address,
    );
    recordConflict(
      conflicts,
      'city',
      survivor.demographics?.city,
      loser,
      loser.demographics?.city,
    );
  }

  const resultingName = pickRichestName(all);
  const namesDiffer = losers.some(
    (loser) =>
      normalizeNameForMerge(loser.name) !== normalizeNameForMerge(survivor.name),
  );

  const connectedParts = [
    survivor.connectedTo,
    ...losers.map((l) => l.connectedTo),
    ...losers
      .filter(
        (loser) =>
          normalizeNameForMerge(loser.name) !==
          normalizeNameForMerge(resultingName),
      )
      .map((loser) => loser.name),
  ]
    .flatMap((value) => (value ?? '').split(/[,;]/))
    .map((part) => part.trim())
    .filter(Boolean);

  const connectedVolunteers = findConnectedVolunteers(all, allContacts);
  const willUpdatePastor =
    tags.includes('pastor') && connectedVolunteers.length > 0;
  const willUpdateParents =
    tags.includes('parent') && connectedVolunteers.length > 0;

  const createdAts = all
    .map((c) => c.createdAt)
    .filter((v): v is string => Boolean(v))
    .sort((a, b) => Date.parse(a) - Date.parse(b));

  return {
    resultingName,
    resultingEmail: emails.primary,
    resultingAltEmail: emails.altEmail,
    resultingTags: tags,
    phone: fillGap(
      survivor.phone,
      losers.map((l) => l.phone).find(Boolean),
    ),
    spouseName: fillGap(
      survivor.spouseName,
      losers.map((l) => l.spouseName).find(Boolean),
    ),
    connectedTo:
      connectedParts.length > 0
        ? [...new Set(connectedParts)].join(', ')
        : undefined,
    demographics: {
      address: fillGap(
        survivor.demographics?.address,
        losers.map((l) => l.demographics?.address).find(Boolean),
      ),
      city: fillGap(
        survivor.demographics?.city,
        losers.map((l) => l.demographics?.city).find(Boolean),
      ),
      state: fillGap(
        survivor.demographics?.state,
        losers.map((l) => l.demographics?.state).find(Boolean),
      ),
      zip: fillGap(
        survivor.demographics?.zip,
        losers.map((l) => l.demographics?.zip).find(Boolean),
      ),
      country: fillGap(
        survivor.demographics?.country,
        losers.map((l) => l.demographics?.country).find(Boolean),
      ),
    },
    conflicts,
    namesDiffer,
    willUpdatePastor,
    willUpdateParents,
    connectedVolunteerNames: connectedVolunteers.map((c) => c.name),
    oldestCreatedAt: createdAts[0],
    newestUpdatedAt: createdAts[createdAts.length - 1],
  };
}

export function buildIdempotencyKey(
  survivorId: string,
  loserIds: string[],
  reasons: string[],
): string {
  const members = [survivorId, ...loserIds].sort().join('|');
  return `merge:${reasons.slice().sort().join('+')}:${members}`;
}

export {
  looksLikeCoupleName,
  pickPastorSource,
  pickParentSource,
  pickRichestName,
};
