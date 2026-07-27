import { firstNameFromFullName } from './coupleApplication';
import type { CouplePreview } from '../types/volunteer';
import type { LongtermVolunteer } from '../types/longtermVolunteer';

export interface LongtermCouplePair {
  primaryId: string;
  partnerId: string;
  reasons: string[];
}

/** Groups that hold dependents — never merge rows within or from these. */
const EXCLUDED_COUPLE_GROUPS = new Set(['Kids 0-18']);

function parseNameParts(name: string): {
  firstName: string;
  lastName: string;
  lastNameTokens: string[];
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0]?.toLowerCase() ?? '',
    lastName: parts[parts.length - 1]?.toLowerCase() ?? '',
    lastNameTokens: parts.slice(1).map((part) => part.toLowerCase()),
  };
}

function normalizeMaritalStatus(status?: string): string {
  return status?.trim().toLowerCase() ?? '';
}

function isExcludedCoupleGroup(groupTitle?: string): boolean {
  return EXCLUDED_COUPLE_GROUPS.has(groupTitle ?? '');
}

function blocksCoupleMerge(status?: string): boolean {
  const normalized = normalizeMaritalStatus(status);
  return normalized === 'single' || normalized === 'dating';
}

/** Normalize street addresses so "Pine Ln" and "Pine Lane" match. */
export function normalizeLongtermHomeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\b(united states|usa)\b/g, '')
    .replace(
      /\b(street|st|road|rd|lane|ln|drive|dr|avenue|ave|boulevard|blvd)\b/g,
      '',
    )
    .replace(/[^a-z0-9]/g, '');
}

export function isMarriedLongtermVolunteer(
  volunteer: Pick<LongtermVolunteer, 'maritalStatus'>,
): boolean {
  return normalizeMaritalStatus(volunteer.maritalStatus) === 'married';
}

export function nameMentionedInFamilyText(
  text: string,
  personName: string,
): boolean {
  const haystack = text.toLowerCase();
  const { firstName, lastName, lastNameTokens } = parseNameParts(personName);
  if (!firstName || !haystack.includes(firstName)) return false;
  if (lastName.length > 2 && haystack.includes(lastName)) return true;
  return lastNameTokens.some(
    (token) => token.length > 3 && haystack.includes(token),
  );
}

export function sharedLongtermLastName(nameA: string, nameB: string): boolean {
  const a = parseNameParts(nameA);
  const b = parseNameParts(nameB);
  if (a.lastName.length > 2 && a.lastName === b.lastName) return true;
  if (
    a.lastName.length > 3 &&
    b.lastName.length > 3 &&
    (a.lastName.includes(b.lastName) || b.lastName.includes(a.lastName))
  ) {
    return true;
  }
  return a.lastNameTokens.some(
    (tokenA) =>
      tokenA.length > 3 &&
      b.lastNameTokens.some((tokenB) => tokenA === tokenB),
  );
}

function capitalizeWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function buildLongtermCoupleDisplayName(
  primaryName: string,
  partnerName: string,
): string {
  const primaryLast = parseNameParts(primaryName).lastName;
  const partnerLast = parseNameParts(partnerName).lastName;
  const primaryFirst = firstNameFromFullName(primaryName);
  const partnerFirst = firstNameFromFullName(partnerName);

  if (
    sharedLongtermLastName(primaryName, partnerName) &&
    primaryLast === partnerLast
  ) {
    return `${capitalizeWord(primaryFirst)} & ${capitalizeWord(partnerFirst)} ${capitalizeWord(primaryLast)}`;
  }

  return `${primaryName} & ${partnerName}`;
}

export function shouldMergeLongtermCouple(
  a: LongtermVolunteer,
  b: LongtermVolunteer,
): { merge: boolean; reasons: string[] } {
  if (
    isExcludedCoupleGroup(a.pipelineStage) ||
    isExcludedCoupleGroup(b.pipelineStage)
  ) {
    return { merge: false, reasons: [] };
  }

  if (blocksCoupleMerge(a.maritalStatus) && blocksCoupleMerge(b.maritalStatus)) {
    return { merge: false, reasons: [] };
  }

  const reasons: string[] = [];
  const addrA = normalizeLongtermHomeAddress(a.homeAddress ?? '');
  const addrB = normalizeLongtermHomeAddress(b.homeAddress ?? '');
  const sameAddress = Boolean(addrA && addrB && addrA === addrB);
  const primaryMentionsPartner = nameMentionedInFamilyText(
    a.familyMembersText ?? '',
    b.name,
  );
  const partnerMentionsPrimary = nameMentionedInFamilyText(
    b.familyMembersText ?? '',
    a.name,
  );
  const sameGroup = Boolean(
    a.pipelineStage && a.pipelineStage === b.pipelineStage,
  );
  const sameLastName = sharedLongtermLastName(a.name, b.name);
  const aMarried = isMarriedLongtermVolunteer(a);
  const bMarried = isMarriedLongtermVolunteer(b);
  const aBlocks = blocksCoupleMerge(a.maritalStatus);
  const bBlocks = blocksCoupleMerge(b.maritalStatus);

  if (sameAddress) reasons.push('same_address');
  if (primaryMentionsPartner) reasons.push('primary_mentions_partner');
  if (partnerMentionsPrimary) reasons.push('partner_mentions_primary');
  if (sameGroup) reasons.push('same_group');
  if (sameLastName) reasons.push('shared_last_name');
  if (aMarried || bMarried) reasons.push('married_status');

  if (sameAddress) return { merge: true, reasons };

  if (primaryMentionsPartner && partnerMentionsPrimary) {
    return { merge: true, reasons };
  }

  if (sameLastName && sameGroup && !aBlocks && !bBlocks) {
    return { merge: true, reasons };
  }

  if (
    sameLastName &&
    (aMarried || bMarried) &&
    (sameGroup || sameAddress || primaryMentionsPartner || partnerMentionsPrimary)
  ) {
    return { merge: true, reasons };
  }

  if (
    (primaryMentionsPartner || partnerMentionsPrimary) &&
    sameAddress
  ) {
    return { merge: true, reasons };
  }

  if (
    sameLastName &&
    (primaryMentionsPartner || partnerMentionsPrimary) &&
    !aBlocks &&
    !bBlocks
  ) {
    return { merge: true, reasons };
  }

  return { merge: false, reasons };
}

function choosePrimaryVolunteer(
  a: LongtermVolunteer,
  b: LongtermVolunteer,
): { primary: LongtermVolunteer; partner: LongtermVolunteer } {
  const idA = BigInt(a.id);
  const idB = BigInt(b.id);
  return idA <= idB
    ? { primary: a, partner: b }
    : { primary: b, partner: a };
}

function buildCouplePreview(
  primary: LongtermVolunteer,
  partner: LongtermVolunteer,
): CouplePreview {
  return {
    displayName: buildLongtermCoupleDisplayName(primary.name, partner.name),
    primaryFirstName: firstNameFromFullName(primary.name),
    primaryEmail:
      primary.email && primary.email !== '—' ? primary.email : undefined,
    partnerName: partner.name,
    partnerFirstName: firstNameFromFullName(partner.name),
    partnerEmail:
      partner.email && partner.email !== '—' ? partner.email : undefined,
    partnerPhotoUrl: partner.profilePhotoUrl,
    partnerItemId: partner.id,
  };
}

function applyCoupleMerges(
  volunteers: LongtermVolunteer[],
): LongtermVolunteer[] {
  const eligible = volunteers.filter(
    (volunteer) => !isExcludedCoupleGroup(volunteer.pipelineStage),
  );
  const candidatePairs: Array<{
    a: LongtermVolunteer;
    b: LongtermVolunteer;
    reasons: string[];
  }> = [];

  for (let i = 0; i < eligible.length; i += 1) {
    for (let j = i + 1; j < eligible.length; j += 1) {
      const result = shouldMergeLongtermCouple(eligible[i], eligible[j]);
      if (result.merge) {
        candidatePairs.push({
          a: eligible[i],
          b: eligible[j],
          reasons: result.reasons,
        });
      }
    }
  }

  candidatePairs.sort(
    (left, right) => right.reasons.length - left.reasons.length,
  );

  const mergedPartnerIds = new Set<string>();
  const coupleByPrimaryId = new Map<string, CouplePreview>();
  const partnerByPrimaryId = new Map<string, string>();

  for (const pair of candidatePairs) {
    if (
      mergedPartnerIds.has(pair.a.id) ||
      mergedPartnerIds.has(pair.b.id)
    ) {
      continue;
    }

    const { primary, partner } = choosePrimaryVolunteer(pair.a, pair.b);
    coupleByPrimaryId.set(primary.id, buildCouplePreview(primary, partner));
    partnerByPrimaryId.set(primary.id, partner.id);
    mergedPartnerIds.add(partner.id);
  }

  return volunteers.map((volunteer) => {
    if (mergedPartnerIds.has(volunteer.id)) {
      const primaryId = [...partnerByPrimaryId.entries()].find(
        ([, partnerId]) => partnerId === volunteer.id,
      )?.[0];
      return {
        ...volunteer,
        mergedIntoItemId: primaryId,
      };
    }

    const couplePreview = coupleByPrimaryId.get(volunteer.id);
    const partnerItemId = partnerByPrimaryId.get(volunteer.id);
    if (!couplePreview || !partnerItemId) return volunteer;

    return {
      ...volunteer,
      name: couplePreview.displayName,
      couplePreview,
      partnerItemId,
    };
  });
}

function resolveDuplicateTargetId(
  keeper: LongtermVolunteer,
  duplicate: LongtermVolunteer,
): string {
  if (keeper.couplePreview) return keeper.id;
  if (duplicate.couplePreview) return duplicate.id;
  if (keeper.mergedIntoItemId) return keeper.mergedIntoItemId;
  if (duplicate.mergedIntoItemId) return duplicate.mergedIntoItemId;
  return BigInt(keeper.id) <= BigInt(duplicate.id) ? keeper.id : duplicate.id;
}

/** Hide duplicate monday items for the same person (same name + birthdate). */
function dedupeSamePersonApplications(
  volunteers: LongtermVolunteer[],
): LongtermVolunteer[] {
  const hideInto = new Map<string, string>();

  for (let i = 0; i < volunteers.length; i += 1) {
    for (let j = i + 1; j < volunteers.length; j += 1) {
      const a = volunteers[i];
      const b = volunteers[j];
      if (!a.birthDate || !b.birthDate || a.birthDate !== b.birthDate) continue;

      const aParts = parseNameParts(a.name);
      const bParts = parseNameParts(b.name);
      if (aParts.firstName !== bParts.firstName) continue;
      if (!sharedLongtermLastName(a.name, b.name)) continue;

      const targetId = resolveDuplicateTargetId(a, b);
      const source = targetId === a.id ? b : a;
      if (source.id === targetId) continue;
      hideInto.set(source.id, targetId);
    }
  }

  if (hideInto.size === 0) return volunteers;

  return volunteers.map((volunteer) => {
    const mergedIntoItemId = hideInto.get(volunteer.id);
    if (!mergedIntoItemId) return volunteer;
    return { ...volunteer, mergedIntoItemId };
  });
}

/** Detect family pairs and duplicate person rows; merge into one profile row. */
export function mergeLongtermCouples(
  volunteers: LongtermVolunteer[],
): LongtermVolunteer[] {
  return dedupeSamePersonApplications(applyCoupleMerges(volunteers));
}

export function visibleLongtermVolunteers(
  volunteers: LongtermVolunteer[],
): LongtermVolunteer[] {
  return volunteers.filter((volunteer) => !volunteer.mergedIntoItemId);
}

export function findLongtermVolunteerById(
  volunteers: LongtermVolunteer[],
  volunteerId: string,
): LongtermVolunteer | undefined {
  const direct = volunteers.find((volunteer) => volunteer.id === volunteerId);
  if (direct && !direct.mergedIntoItemId) return direct;

  const mergedPartner = volunteers.find(
    (volunteer) =>
      volunteer.partnerItemId === volunteerId ||
      volunteer.couplePreview?.partnerItemId === volunteerId,
  );
  if (mergedPartner) return mergedPartner;

  if (direct?.mergedIntoItemId) {
    return volunteers.find(
      (volunteer) => volunteer.id === direct.mergedIntoItemId,
    );
  }

  return undefined;
}
