/**
 * fieldMergeChoices.ts — UI field keep/delete choices + apply overrides to plans.
 *
 * Email / phone / address use multi-keep (checkboxes + Primary).
 * Other scalars stay single-choice radios. Defaults match buildFieldMergePlan().
 */

import type { ContactListItem, ContactTag } from '../../../types/contact';
import { CONTACT_TAGS } from '../../../types/contact';
import { mergeTags } from '../../contactSyncHelpers';
import {
  buildFieldMergePlan,
  combineAddresses,
  combineEmails,
  combinePhones,
} from './fieldMergePlan';
import {
  collectMailingBlocks,
  formatMailingBlock,
  joinAltAddresses,
  mailingBlocksEqual,
  parseMailingBlock,
  splitAltAddresses,
} from './mailingAddress';
import { normalizeEmailForMerge } from './normalize';
import { pickParentSource, pickPastorSource } from './survivorScore';
import type {
  FieldMergeOverrides,
  FieldMergePlan,
  MergeFieldChoice,
  MergeFieldChoices,
  MergeFieldValueOption,
  MergeMultiFieldChoice,
  MergeMultiFieldKind,
  MergeMultiValueSelection,
  MergeScalarFieldKey,
  MergeSourceChoice,
  MergeTagChoice,
} from './types';

const FIELD_LABELS: Record<MergeScalarFieldKey, string> = {
  name: 'Name',
  spouseName: 'Spouse',
  connectedTo: 'Connected to',
};

const MULTI_LABELS: Record<MergeMultiFieldKind, string> = {
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
};

function trimValue(value: string | undefined): string {
  return value?.trim() ?? '';
}

function splitAltEmails(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;]/)
    .map((part) => normalizeEmailForMerge(part) || part.trim())
    .filter(Boolean);
}

function splitAltPhones(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function phoneKey(value: string): string {
  return value.replace(/\D/g, '') || value.trim().toLowerCase();
}

function emailsEqual(a: string, b: string): boolean {
  const na = normalizeEmailForMerge(a);
  const nb = normalizeEmailForMerge(b);
  if (na && nb) return na === nb;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function phonesEqual(a: string, b: string): boolean {
  return phoneKey(a) === phoneKey(b);
}

export function readMergeFieldValue(
  contact: ContactListItem,
  key: MergeScalarFieldKey,
): string {
  switch (key) {
    case 'name':
      return trimValue(contact.name);
    case 'spouseName':
      return trimValue(contact.spouseName);
    case 'connectedTo':
      return trimValue(contact.connectedTo);
    default:
      return '';
  }
}

function compareFieldValues(
  _key: MergeScalarFieldKey,
  a: string,
  b: string,
): boolean {
  void _key;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function recommendedForKey(
  plan: FieldMergePlan,
  key: MergeScalarFieldKey,
): string {
  switch (key) {
    case 'name':
      return trimValue(plan.resultingName);
    case 'spouseName':
      return trimValue(plan.spouseName);
    case 'connectedTo':
      return trimValue(plan.connectedTo);
    default:
      return '';
  }
}

function uniqueScalarOptions(
  contacts: ContactListItem[],
  key: MergeScalarFieldKey,
): MergeFieldValueOption[] {
  const options: MergeFieldValueOption[] = [];
  for (const contact of contacts) {
    const value = readMergeFieldValue(contact, key);
    if (!value) continue;
    const exists = options.some((opt) =>
      compareFieldValues(key, opt.value, value),
    );
    if (!exists) {
      options.push({
        contactId: contact.id,
        contactName: contact.name,
        value,
      });
    }
  }
  return options;
}

function buildScalarChoice(
  key: MergeScalarFieldKey,
  contacts: ContactListItem[],
  plan: FieldMergePlan,
): MergeFieldChoice | null {
  const recommendedValue = recommendedForKey(plan, key);
  let options = uniqueScalarOptions(contacts, key);

  if (
    recommendedValue &&
    !options.some((opt) =>
      compareFieldValues(key, opt.value, recommendedValue),
    )
  ) {
    options = [
      {
        contactId: contacts[0]!.id,
        contactName: 'Recommended',
        value: recommendedValue,
      },
      ...options,
    ];
  }

  if (options.length === 0 && !recommendedValue) return null;

  const needsChoice = options.length > 1;
  const resolvedValue = recommendedValue || options[0]?.value || '';

  return {
    key,
    label: FIELD_LABELS[key],
    needsChoice,
    options,
    recommendedValue: resolvedValue,
    resolvedValue,
  };
}

function collectEmailOptions(
  contacts: ContactListItem[],
): MergeFieldValueOption[] {
  const options: MergeFieldValueOption[] = [];
  for (const contact of contacts) {
    const values = [
      normalizeEmailForMerge(contact.email) ||
        (contact.email === '—' ? '' : trimValue(contact.email)),
      ...splitAltEmails(contact.altEmail),
    ].filter(Boolean);
    for (const value of values) {
      if (options.some((opt) => emailsEqual(opt.value, value))) continue;
      options.push({
        contactId: contact.id,
        contactName: contact.name,
        value,
      });
    }
  }
  return options;
}

function collectPhoneOptions(
  contacts: ContactListItem[],
): MergeFieldValueOption[] {
  const options: MergeFieldValueOption[] = [];
  for (const contact of contacts) {
    const values = [
      contact.phone?.trim(),
      ...splitAltPhones(contact.altPhone),
    ].filter((v): v is string => Boolean(v));
    for (const value of values) {
      if (options.some((opt) => phonesEqual(opt.value, value))) continue;
      options.push({
        contactId: contact.id,
        contactName: contact.name,
        value,
      });
    }
  }
  return options;
}

function collectAddressOptions(
  contacts: ContactListItem[],
): MergeFieldValueOption[] {
  const options: MergeFieldValueOption[] = [];
  for (const contact of contacts) {
    for (const value of collectMailingBlocks(contact)) {
      if (options.some((opt) => mailingBlocksEqual(opt.value, value))) {
        continue;
      }
      options.push({
        contactId: contact.id,
        contactName: contact.name,
        value,
      });
    }
  }
  return options;
}

function buildMultiChoice(
  kind: MergeMultiFieldKind,
  contacts: ContactListItem[],
  plan: FieldMergePlan,
): MergeMultiFieldChoice | null {
  const options =
    kind === 'email'
      ? collectEmailOptions(contacts)
      : kind === 'phone'
        ? collectPhoneOptions(contacts)
        : collectAddressOptions(contacts);

  if (options.length === 0) return null;

  let recommendedPrimary = '';
  let recommendedKept = options.map((o) => o.value);

  if (kind === 'email') {
    recommendedPrimary = trimValue(plan.resultingEmail);
    const alts = splitAltEmails(plan.resultingAltEmail);
    recommendedKept = [
      recommendedPrimary,
      ...alts.filter((a) => !emailsEqual(a, recommendedPrimary)),
    ].filter(Boolean);
  } else if (kind === 'phone') {
    recommendedPrimary = trimValue(plan.phone);
    const alts = splitAltPhones(plan.altPhone);
    recommendedKept = [
      recommendedPrimary,
      ...alts.filter((a) => !phonesEqual(a, recommendedPrimary)),
    ].filter(Boolean);
  } else {
    recommendedPrimary = formatMailingBlock(plan.demographics);
    const alts = splitAltAddresses(plan.altAddress);
    recommendedKept = [
      recommendedPrimary,
      ...alts.filter((a) => !mailingBlocksEqual(a, recommendedPrimary)),
    ].filter(Boolean);
  }

  // Ensure recommended values appear in options.
  for (const value of recommendedKept) {
    if (
      !options.some((opt) =>
        kind === 'email'
          ? emailsEqual(opt.value, value)
          : kind === 'phone'
            ? phonesEqual(opt.value, value)
            : mailingBlocksEqual(opt.value, value),
      )
    ) {
      options.unshift({
        contactId: contacts[0]!.id,
        contactName: 'Recommended',
        value,
      });
    }
  }

  if (!recommendedPrimary && options[0]) {
    recommendedPrimary = options[0].value;
  }
  if (recommendedKept.length === 0) {
    recommendedKept = options.map((o) => o.value);
  }

  return {
    kind,
    label: MULTI_LABELS[kind],
    needsChoice: options.length > 1,
    options,
    recommendedKept,
    recommendedPrimary,
  };
}

function buildTagChoice(contacts: ContactListItem[]): MergeTagChoice {
  let recommendedTags: ContactTag[] = [];
  for (const contact of contacts) {
    recommendedTags = mergeTags(recommendedTags, contact.tags);
  }
  const byContact = contacts.map((contact) => ({
    contactId: contact.id,
    contactName: contact.name,
    tags: [...contact.tags],
  }));
  const setsEqual =
    byContact.length > 0 &&
    byContact.every((entry) => {
      const a = [...entry.tags].sort().join('|');
      const b = [...byContact[0]!.tags].sort().join('|');
      return a === b;
    });
  return {
    needsChoice: recommendedTags.length > 0 && !setsEqual,
    recommendedTags,
    byContact,
  };
}

function buildSourceChoice(
  kind: 'pastor' | 'parent',
  contacts: ContactListItem[],
): MergeSourceChoice | undefined {
  const tag = kind === 'pastor' ? 'pastor' : 'parent';
  const candidates = contacts.filter((c) => c.tags.includes(tag));
  if (candidates.length === 0) return undefined;
  const recommended =
    kind === 'pastor'
      ? pickPastorSource(contacts)
      : pickParentSource(contacts);
  if (!recommended) return undefined;
  return {
    kind,
    label: kind === 'pastor' ? 'Pastor sync source' : 'Parents sync source',
    needsChoice: candidates.length > 1,
    options: candidates.map((c) => ({
      contactId: c.id,
      contactName: c.name,
    })),
    recommendedContactId: recommended.id,
  };
}

/** Build keep/delete descriptors for the merge confirm UI. */
export function buildMergeFieldChoices(
  survivor: ContactListItem,
  losers: ContactListItem[],
  allContacts: ContactListItem[] = [],
): MergeFieldChoices {
  const plan = buildFieldMergePlan(survivor, losers, allContacts);
  const contacts = [survivor, ...losers];
  const keys: MergeScalarFieldKey[] = ['name', 'spouseName', 'connectedTo'];
  const fields = keys
    .map((key) => buildScalarChoice(key, contacts, plan))
    .filter((choice): choice is MergeFieldChoice => choice != null);

  const multiFields = (['email', 'phone', 'address'] as const)
    .map((kind) => buildMultiChoice(kind, contacts, plan))
    .filter((choice): choice is MergeMultiFieldChoice => choice != null);

  return {
    fields,
    multiFields,
    tags: buildTagChoice(contacts),
    pastorSource: plan.willUpdatePastor
      ? buildSourceChoice('pastor', contacts)
      : undefined,
    parentSource: plan.willUpdateParents
      ? buildSourceChoice('parent', contacts)
      : undefined,
  };
}

/** Default UI selections matching the engine plan. */
export function defaultSelectionsFromChoices(choices: MergeFieldChoices): {
  fieldValues: Partial<Record<MergeScalarFieldKey, string>>;
  multi: Record<MergeMultiFieldKind, MergeMultiValueSelection>;
  tags: ContactTag[];
  pastorSourceId?: string;
  parentSourceId?: string;
} {
  const fieldValues: Partial<Record<MergeScalarFieldKey, string>> = {};
  for (const field of choices.fields) {
    fieldValues[field.key] = field.recommendedValue;
  }

  const multi: Record<MergeMultiFieldKind, MergeMultiValueSelection> = {
    email: { kept: [], primary: '' },
    phone: { kept: [], primary: '' },
    address: { kept: [], primary: '' },
  };
  for (const field of choices.multiFields) {
    multi[field.kind] = {
      kept: [...field.recommendedKept],
      primary: field.recommendedPrimary,
    };
  }

  return {
    fieldValues,
    multi,
    tags: [...choices.tags.recommendedTags],
    pastorSourceId: choices.pastorSource?.recommendedContactId,
    parentSourceId: choices.parentSource?.recommendedContactId,
  };
}

function partitionMulti(
  selection: MergeMultiValueSelection | undefined,
  equals: (a: string, b: string) => boolean,
): { primary: string; alts: string[] } {
  const kept = (selection?.kept ?? []).map((v) => v.trim()).filter(Boolean);
  if (kept.length === 0) {
    return { primary: '', alts: [] };
  }
  const primaryCandidate = selection?.primary?.trim() || kept[0]!;
  const primary =
    kept.find((v) => equals(v, primaryCandidate)) ?? kept[0]!;
  const alts = kept.filter((v) => !equals(v, primary));
  return { primary, alts };
}

/** Convert UI selections into executeMerge overrides. */
export function selectionsToFieldOverrides(selections: {
  fieldValues: Partial<Record<MergeScalarFieldKey, string>>;
  multi?: Partial<Record<MergeMultiFieldKind, MergeMultiValueSelection>>;
  tags: ContactTag[];
  pastorSourceId?: string;
  parentSourceId?: string;
}): FieldMergeOverrides {
  const fv = selections.fieldValues;
  const emailParts = partitionMulti(selections.multi?.email, emailsEqual);
  const phoneParts = partitionMulti(selections.multi?.phone, phonesEqual);
  const addressParts = partitionMulti(
    selections.multi?.address,
    mailingBlocksEqual,
  );

  return {
    resultingName: fv.name,
    resultingEmail: emailParts.primary || undefined,
    resultingAltEmail:
      emailParts.alts.length > 0 ? emailParts.alts.join(', ') : '',
    resultingTags: selections.tags.filter((tag) =>
      (CONTACT_TAGS as readonly string[]).includes(tag),
    ),
    phone: phoneParts.primary || undefined,
    altPhone: phoneParts.alts.length > 0 ? phoneParts.alts.join(', ') : '',
    spouseName: fv.spouseName,
    connectedTo: fv.connectedTo,
    demographics: addressParts.primary
      ? parseMailingBlock(addressParts.primary)
      : undefined,
    altAddress: joinAltAddresses(addressParts.alts) ?? '',
    pastorSourceId: selections.pastorSourceId,
    parentSourceId: selections.parentSourceId,
  };
}

/**
 * When the reviewer changes primary email, rebuild Alt Email from remaining
 * addresses unless they already customized alt away from the prior recommendation.
 * @deprecated Prefer multi-field selections; kept for callers that only flip primary.
 */
export function recomputeAltEmailForPrimary(
  survivor: ContactListItem,
  losers: ContactListItem[],
  primaryEmail: string,
): string | undefined {
  const primary =
    normalizeEmailForMerge(primaryEmail) || trimValue(primaryEmail);
  const owner =
    [survivor, ...losers].find((c) => {
      const email = normalizeEmailForMerge(c.email) || trimValue(c.email);
      return email && emailsEqual(email, primary);
    }) ?? survivor;
  const rest = [survivor, ...losers].filter((c) => c.id !== owner.id);
  const combined = combineEmails(
    { ...owner, email: primary || owner.email },
    rest,
  );
  return combined.altEmail;
}

/** Apply reviewer overrides on top of an engine FieldMergePlan. */
export function applyFieldMergeOverrides(
  plan: FieldMergePlan,
  overrides: FieldMergeOverrides | undefined,
  _mergeContacts: ContactListItem[] = [],
): FieldMergePlan {
  void _mergeContacts;
  if (!overrides) return plan;

  const resultingTags = overrides.resultingTags ?? plan.resultingTags;
  const next: FieldMergePlan = {
    ...plan,
    resultingName: overrides.resultingName?.trim() || plan.resultingName,
    resultingEmail: overrides.resultingEmail?.trim() || plan.resultingEmail,
    resultingAltEmail:
      overrides.resultingAltEmail !== undefined
        ? overrides.resultingAltEmail.trim() || undefined
        : plan.resultingAltEmail,
    resultingTags,
    phone:
      overrides.phone !== undefined
        ? overrides.phone.trim() || undefined
        : plan.phone,
    altPhone:
      overrides.altPhone !== undefined
        ? overrides.altPhone.trim() || undefined
        : plan.altPhone,
    spouseName:
      overrides.spouseName !== undefined
        ? overrides.spouseName.trim() || undefined
        : plan.spouseName,
    connectedTo:
      overrides.connectedTo !== undefined
        ? overrides.connectedTo.trim() || undefined
        : plan.connectedTo,
    demographics: {
      address:
        overrides.demographics?.address !== undefined
          ? overrides.demographics.address.trim() || undefined
          : plan.demographics.address,
      city:
        overrides.demographics?.city !== undefined
          ? overrides.demographics.city.trim() || undefined
          : plan.demographics.city,
      state:
        overrides.demographics?.state !== undefined
          ? overrides.demographics.state.trim() || undefined
          : plan.demographics.state,
      zip:
        overrides.demographics?.zip !== undefined
          ? overrides.demographics.zip.trim() || undefined
          : plan.demographics.zip,
      country:
        overrides.demographics?.country !== undefined
          ? overrides.demographics.country.trim() || undefined
          : plan.demographics.country,
    },
    altAddress:
      overrides.altAddress !== undefined
        ? overrides.altAddress.trim() || undefined
        : plan.altAddress,
  };

  // Volunteer sync still requires connected volunteers from the original plan.
  next.willUpdatePastor =
    resultingTags.includes('pastor') &&
    plan.connectedVolunteerNames.length > 0;
  next.willUpdateParents =
    resultingTags.includes('parent') &&
    plan.connectedVolunteerNames.length > 0;

  return next;
}

// Re-export combine helpers used by tests / callers.
export { combineEmails, combinePhones, combineAddresses };
