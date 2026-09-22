/**
 * resolveContactIdentity.ts — Decide whether a verified email is an existing
 * contact, a new contact, or something staff must sort out.
 *
 * Email (including Alt Email) is the only automatic link. One phone plus last
 * name match asks the person to confirm before we attach the new email.
 * More than one such match is left for staff. Fuzzy name matches are ignored.
 */

import {
  isBlankContactValue,
  normalizePhoneDigits,
  splitPersonName,
  type VolunteerProfile,
} from './profile.ts';

export interface ContactSnapshot {
  id: string;
  name: string;
  email: string;
  altEmail: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  dateOfBirth: string;
}

export type DemographicKey =
  | 'phone'
  | 'street'
  | 'city'
  | 'state'
  | 'zip'
  | 'country'
  | 'dateOfBirth';

export type IdentityDecision =
  | {
      status: 'created';
    }
  | {
      status: 'found';
      contactId: string;
      fills: Partial<Record<DemographicKey | 'name', string>>;
    }
  | {
      status: 'confirm_match';
      contactId: string;
    }
  | {
      status: 'needs_staff';
      reason: 'duplicate_email' | 'phone_name_match';
    };

const FILL_FIELDS: DemographicKey[] = [
  'phone',
  'street',
  'city',
  'state',
  'zip',
  'country',
  'dateOfBirth',
];

export function decideContactIdentity(input: {
  profile: VolunteerProfile;
  emailMatches: ContactSnapshot[];
  phoneNameMatches: ContactSnapshot[];
}): IdentityDecision {
  const emailMatches = uniqueById(input.emailMatches);
  if (emailMatches.length > 1) {
    return { status: 'needs_staff', reason: 'duplicate_email' };
  }
  if (emailMatches.length === 1) {
    return {
      status: 'found',
      contactId: emailMatches[0]!.id,
      fills: blankFills(emailMatches[0]!, input.profile),
    };
  }
  const phoneNameMatches = uniqueById(input.phoneNameMatches);
  if (phoneNameMatches.length === 1) {
    return { status: 'confirm_match', contactId: phoneNameMatches[0]!.id };
  }
  if (phoneNameMatches.length > 1) {
    return { status: 'needs_staff', reason: 'phone_name_match' };
  }
  return { status: 'created' };
}

export function contactMatchesPhoneAndLastName(
  contact: ContactSnapshot,
  profile: VolunteerProfile,
): boolean {
  const lastName = splitPersonName(profile.fullName).last;
  const contactLast = splitPersonName(contact.name).last;
  if (!lastName || !contactLast || lastName !== contactLast) return false;
  const incoming = normalizePhoneDigits(profile.phone);
  const existing = normalizePhoneDigits(contact.phone);
  if (incoming.length < 7 || existing.length < 7) return false;
  return incoming === existing;
}

function blankFills(
  contact: ContactSnapshot,
  profile: VolunteerProfile,
): Partial<Record<DemographicKey | 'name', string>> {
  const fills: Partial<Record<DemographicKey | 'name', string>> = {};
  if (isBlankContactValue(contact.name)) {
    fills.name = profile.fullName;
  }
  const incoming: Record<DemographicKey, string> = {
    phone: profile.phone,
    street: profile.street,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
    country: profile.country,
    dateOfBirth: profile.dateOfBirth,
  };
  for (const field of FILL_FIELDS) {
    if (isBlankContactValue(contact[field])) {
      fills[field] = incoming[field];
    }
  }
  return fills;
}

function uniqueById(contacts: ContactSnapshot[]): ContactSnapshot[] {
  const seen = new Set<string>();
  const unique: ContactSnapshot[] = [];
  for (const contact of contacts) {
    if (seen.has(contact.id)) continue;
    seen.add(contact.id);
    unique.push(contact);
  }
  return unique;
}
