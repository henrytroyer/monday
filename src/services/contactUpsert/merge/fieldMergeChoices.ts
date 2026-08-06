/**
 * fieldMergeChoices.ts — UI field keep/delete choices + apply overrides to plans.
 * Defaults always match buildFieldMergePlan() recommendations.
 */

import type { ContactListItem, ContactTag } from '../../../types/contact';
import { CONTACT_TAGS } from '../../../types/contact';
import { mergeTags } from '../../contactSyncHelpers';
import { buildFieldMergePlan, combineEmails } from './fieldMergePlan';
import { normalizeEmailForMerge } from './normalize';
import { pickParentSource, pickPastorSource } from './survivorScore';
import type {
  FieldMergeOverrides,
  FieldMergePlan,
  MergeFieldChoice,
  MergeFieldChoices,
  MergeFieldValueOption,
  MergeScalarFieldKey,
  MergeSourceChoice,
  MergeTagChoice,
} from './types';

const FIELD_LABELS: Record<MergeScalarFieldKey, string> = {
  name: 'Name',
  email: 'Email',
  altEmail: 'Alt Email',
  phone: 'Phone',
  spouseName: 'Spouse',
  connectedTo: 'Connected to',
  address: 'Address',
  city: 'City',
  state: 'State',
  zip: 'Zip',
  country: 'Country',
};

function trimValue(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function readMergeFieldValue(
  contact: ContactListItem,
  key: MergeScalarFieldKey,
): string {
  switch (key) {
    case 'name':
      return trimValue(contact.name);
    case 'email':
      return (
        normalizeEmailForMerge(contact.email) ||
        trimValue(contact.email === '—' ? '' : contact.email)
      );
    case 'altEmail':
      return trimValue(contact.altEmail);
    case 'phone':
      return trimValue(contact.phone);
    case 'spouseName':
      return trimValue(contact.spouseName);
    case 'connectedTo':
      return trimValue(contact.connectedTo);
    case 'address':
      return trimValue(contact.demographics?.address);
    case 'city':
      return trimValue(contact.demographics?.city);
    case 'state':
      return trimValue(contact.demographics?.state);
    case 'zip':
      return trimValue(contact.demographics?.zip);
    case 'country':
      return trimValue(contact.demographics?.country);
    default:
      return '';
  }
}

function compareFieldValues(
  key: MergeScalarFieldKey,
  a: string,
  b: string,
): boolean {
  if (key === 'email' || key === 'altEmail') {
    const na = normalizeEmailForMerge(a);
    const nb = normalizeEmailForMerge(b);
    if (na && nb) return na === nb;
  }
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function recommendedForKey(
  plan: FieldMergePlan,
  key: MergeScalarFieldKey,
): string {
  switch (key) {
    case 'name':
      return trimValue(plan.resultingName);
    case 'email':
      return trimValue(plan.resultingEmail);
    case 'altEmail':
      return trimValue(plan.resultingAltEmail);
    case 'phone':
      return trimValue(plan.phone);
    case 'spouseName':
      return trimValue(plan.spouseName);
    case 'connectedTo':
      return trimValue(plan.connectedTo);
    case 'address':
      return trimValue(plan.demographics.address);
    case 'city':
      return trimValue(plan.demographics.city);
    case 'state':
      return trimValue(plan.demographics.state);
    case 'zip':
      return trimValue(plan.demographics.zip);
    case 'country':
      return trimValue(plan.demographics.country);
    default:
      return '';
  }
}

function uniqueOptions(
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
  let options = uniqueOptions(contacts, key);

  // Engine may synthesize email/alt/connectedTo beyond a single contact value.
  if (
    recommendedValue &&
    !options.some((opt) => compareFieldValues(key, opt.value, recommendedValue))
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
  const keys: MergeScalarFieldKey[] = [
    'name',
    'email',
    'altEmail',
    'phone',
    'spouseName',
    'connectedTo',
    'address',
    'city',
    'state',
    'zip',
    'country',
  ];
  const fields = keys
    .map((key) => buildScalarChoice(key, contacts, plan))
    .filter((choice): choice is MergeFieldChoice => choice != null);

  return {
    fields,
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
  tags: ContactTag[];
  pastorSourceId?: string;
  parentSourceId?: string;
} {
  const fieldValues: Partial<Record<MergeScalarFieldKey, string>> = {};
  for (const field of choices.fields) {
    fieldValues[field.key] = field.recommendedValue;
  }
  return {
    fieldValues,
    tags: [...choices.tags.recommendedTags],
    pastorSourceId: choices.pastorSource?.recommendedContactId,
    parentSourceId: choices.parentSource?.recommendedContactId,
  };
}

/** Convert UI selections into executeMerge overrides. */
export function selectionsToFieldOverrides(selections: {
  fieldValues: Partial<Record<MergeScalarFieldKey, string>>;
  tags: ContactTag[];
  pastorSourceId?: string;
  parentSourceId?: string;
}): FieldMergeOverrides {
  const fv = selections.fieldValues;
  return {
    resultingName: fv.name,
    resultingEmail: fv.email,
    resultingAltEmail: fv.altEmail,
    resultingTags: selections.tags.filter((tag) =>
      (CONTACT_TAGS as readonly string[]).includes(tag),
    ),
    phone: fv.phone,
    spouseName: fv.spouseName,
    connectedTo: fv.connectedTo,
    demographics: {
      address: fv.address,
      city: fv.city,
      state: fv.state,
      zip: fv.zip,
      country: fv.country,
    },
    pastorSourceId: selections.pastorSourceId,
    parentSourceId: selections.parentSourceId,
  };
}

/**
 * When the reviewer changes primary email, rebuild Alt Email from remaining
 * addresses unless they already customized alt away from the prior recommendation.
 */
export function recomputeAltEmailForPrimary(
  survivor: ContactListItem,
  losers: ContactListItem[],
  primaryEmail: string,
): string | undefined {
  const primary =
    normalizeEmailForMerge(primaryEmail) || trimValue(primaryEmail);
  // Temporarily treat the contact that owns this email as "survivor" for combineEmails.
  const owner =
    [survivor, ...losers].find((c) => {
      const email = normalizeEmailForMerge(c.email) || trimValue(c.email);
      return email && compareFieldValues('email', email, primary);
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
