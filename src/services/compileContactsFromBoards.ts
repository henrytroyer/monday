/**
 * Compile a comprehensive Contacts list by merging people across:
 * Contacts, Short-term Applications, Long-term Applications,
 * Current Service Ended, and Donations boards.
 *
 * Prefer real Contacts board ids. People found only on other boards get a
 * `compiled:…` id so they still appear in the CRM directory.
 *
 * Same person is combined by email first, then by name+phone / unique name.
 * Mailing address is mass-compiled from every board source (richest wins).
 */

import { longtermColumnMap } from '../config/longtermColumnMap';
import type {
  ContactListDemographics,
  ContactListItem,
  ContactTag,
} from '../types/contact';
import { resolveApplicationDemographics } from '../utils/applicationDemographics';
import {
  mergeRichestDemographics,
  normalizeContactDemographics,
} from '../utils/contactDemographicsMerge';
import { parseFilloutAddress } from '../utils/formatContactAddress';
import {
  normalizeDateOfBirth,
  readMondayDateColumnText,
} from '../utils/formatDateOfBirth';
import {
  normalizePersonName,
  volunteerNameFromItemTitle,
} from '../utils/personNameMatch';
import { mergeTags } from './contactSyncHelpers';
import { getDonationColumnText } from './mapMondayToDonation';
import { getColumnText, type MondayBoardItem } from './mapMondayToCrm';
import {
  findServiceEndedColumn,
  getServiceEndedColumnText,
} from './mapServiceEndedToTerm';

export const COMPILED_CONTACT_ID_PREFIX = 'compiled:';

export function isCompiledContactId(contactId: string): boolean {
  return contactId.startsWith(COMPILED_CONTACT_ID_PREFIX);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Normalized usable email key (lowercase). Used for compile merge maps. */
function usableEmail(email: string | undefined | null): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed || trimmed === '—') return null;
  if (!trimmed.includes('@')) return null;
  return normalizeEmail(trimmed);
}

/** Digits-only phone key; use last 10 digits so +1 / local forms match. */
function normalizePhoneDigits(phone: string | undefined | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function isSyntheticRoleName(name: string): boolean {
  return /^(parent of|pastor for)\b/i.test(name.trim());
}

function findColumnByTitle(
  columnValues: MondayBoardItem['column_values'],
  title: string,
): MondayBoardItem['column_values'][number] | undefined {
  const target = title.trim().toLowerCase();
  return columnValues.find(
    (col) => (col.column?.title?.trim() || '').toLowerCase() === target,
  );
}

function getLongtermText(
  columnValues: MondayBoardItem['column_values'],
  key: keyof typeof longtermColumnMap,
): string {
  return findColumnByTitle(columnValues, longtermColumnMap[key])?.text?.trim() || '';
}

function getLongtermDateText(
  columnValues: MondayBoardItem['column_values'],
  key: keyof typeof longtermColumnMap,
): string {
  return readMondayDateColumnText(findColumnByTitle(columnValues, longtermColumnMap[key]));
}

function getServiceEndedDateText(
  columnValues: MondayBoardItem['column_values'],
  fieldKey: Parameters<typeof findServiceEndedColumn>[1],
): string {
  return readMondayDateColumnText(findServiceEndedColumn(columnValues, fieldKey));
}

interface MutableContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  createdAt?: string;
  tags: ContactTag[];
  demographics?: ContactListDemographics;
  /** True when backed by a real Contacts board item. */
  onContactsBoard: boolean;
}

function toListItem(contact: MutableContact): ContactListItem {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    profilePhotoUrl: contact.profilePhotoUrl,
    createdAt: contact.createdAt,
    tags: [...contact.tags],
    demographics: normalizeContactDemographics(contact.demographics),
  };
}

function compiledId(source: string, seed: string): string {
  const safe = seed
    .toLowerCase()
    .replace(/[^a-z0-9@._+-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${COMPILED_CONTACT_ID_PREFIX}${source}:${safe || 'unknown'}`;
}

function absorbContact(into: MutableContact, from: MutableContact): void {
  if (from.onContactsBoard && !into.onContactsBoard) {
    into.id = from.id;
    into.onContactsBoard = true;
    if (usableEmail(from.email)) {
      into.email = from.email;
    }
    if (from.name.trim() && !isSyntheticRoleName(from.name)) {
      into.name = from.name;
    }
  } else if (
    into.onContactsBoard === false &&
    from.name.trim() &&
    (into.name === into.email || isSyntheticRoleName(into.name))
  ) {
    into.name = from.name;
  } else if (
    from.name.trim() &&
    !isSyntheticRoleName(from.name) &&
    (into.name === into.email || !into.name.trim())
  ) {
    into.name = from.name;
  }

  if (!into.phone && from.phone?.trim()) {
    into.phone = from.phone.trim();
  }
  if (!into.profilePhotoUrl && from.profilePhotoUrl) {
    into.profilePhotoUrl = from.profilePhotoUrl;
  }
  if (!into.createdAt && from.createdAt) {
    into.createdAt = from.createdAt;
  }
  into.tags = mergeTags(into.tags, from.tags);
  into.demographics = mergeRichestDemographics(
    into.demographics,
    from.demographics,
  );
}

/**
 * Collapse duplicate people that share name+phone or a unique name with a
 * no-email Contacts row.
 */
function combineSamePeople(contacts: MutableContact[]): {
  contacts: MutableContact[];
  mergedDuplicates: number;
} {
  let mergedDuplicates = 0;
  const byEmail = new Map<string, MutableContact>();
  const orphans: MutableContact[] = [];

  for (const contact of contacts) {
    const email = usableEmail(contact.email);
    if (email) {
      const key = normalizeEmail(email);
      const existing = byEmail.get(key);
      if (existing) {
        absorbContact(existing, contact);
        mergedDuplicates += 1;
      } else {
        byEmail.set(key, { ...contact, tags: [...contact.tags] });
      }
    } else {
      orphans.push({ ...contact, tags: [...contact.tags] });
    }
  }

  // Fold no-email Contacts rows into the unique same-name emailed contact.
  const keptOrphans: MutableContact[] = [];
  for (const orphan of orphans) {
    if (isSyntheticRoleName(orphan.name)) {
      keptOrphans.push(orphan);
      continue;
    }
    const nameKey = normalizePersonName(orphan.name);
    if (!nameKey) {
      keptOrphans.push(orphan);
      continue;
    }

    const nameMatches = [...byEmail.values()].filter(
      (contact) =>
        !isSyntheticRoleName(contact.name) &&
        normalizePersonName(contact.name) === nameKey,
    );

    const phone = normalizePhoneDigits(orphan.phone);
    const phoneMatches =
      phone.length >= 7
        ? nameMatches.filter(
            (contact) => normalizePhoneDigits(contact.phone) === phone,
          )
        : [];

    const target =
      phoneMatches.length === 1
        ? phoneMatches[0]!
        : nameMatches.length === 1
          ? nameMatches[0]!
          : null;

    if (target) {
      absorbContact(target, orphan);
      mergedDuplicates += 1;
    } else {
      // Collapse duplicate no-email rows (same name + phone / both no phone).
      let mergedIntoOrphan = false;
      for (const existing of keptOrphans) {
        if (
          isSyntheticRoleName(existing.name) ||
          normalizePersonName(existing.name) !== nameKey
        ) {
          continue;
        }
        const existingPhone = normalizePhoneDigits(existing.phone);
        const phonesMatch =
          phone.length >= 7 &&
          existingPhone.length >= 7 &&
          phone === existingPhone;
        const bothLackPhone = phone.length < 7 && existingPhone.length < 7;
        if (phonesMatch || bothLackPhone) {
          absorbContact(existing, orphan);
          mergedDuplicates += 1;
          mergedIntoOrphan = true;
          break;
        }
      }
      if (!mergedIntoOrphan) keptOrphans.push(orphan);
    }
  }

  // Merge emailed contacts that share the same person name + phone.
  const emailKeys = [...byEmail.keys()];
  const absorbedKeys = new Set<string>();
  const namePhoneIndex = new Map<string, string>();

  for (const emailKey of emailKeys) {
    if (absorbedKeys.has(emailKey)) continue;
    const contact = byEmail.get(emailKey);
    if (!contact || isSyntheticRoleName(contact.name)) continue;

    const nameKey = normalizePersonName(contact.name);
    const phone = normalizePhoneDigits(contact.phone);
    if (!nameKey || phone.length < 7) continue;

    const npKey = `${nameKey}|${phone}`;
    const existingKey = namePhoneIndex.get(npKey);
    if (!existingKey || existingKey === emailKey) {
      namePhoneIndex.set(npKey, emailKey);
      continue;
    }

    const existing = byEmail.get(existingKey);
    if (!existing) {
      namePhoneIndex.set(npKey, emailKey);
      continue;
    }

    // Prefer Contacts-board record as the survivor.
    if (contact.onContactsBoard && !existing.onContactsBoard) {
      absorbContact(contact, existing);
      byEmail.set(emailKey, contact);
      byEmail.delete(existingKey);
      absorbedKeys.add(existingKey);
      namePhoneIndex.set(npKey, emailKey);
    } else {
      absorbContact(existing, contact);
      byEmail.delete(emailKey);
      absorbedKeys.add(emailKey);
    }
    mergedDuplicates += 1;
  }

  return {
    contacts: [...byEmail.values(), ...keptOrphans],
    mergedDuplicates,
  };
}

export interface CompileContactsFromBoardsInput {
  contacts: ContactListItem[];
  shortTermApplications?: MondayBoardItem[];
  longTermApplications?: MondayBoardItem[];
  serviceEndedItems?: MondayBoardItem[];
  donationItems?: MondayBoardItem[];
}

export interface CompileContactsFromBoardsResult {
  contacts: ContactListItem[];
  stats: {
    fromContactsBoard: number;
    addedFromOtherBoards: number;
    mergedDuplicates: number;
    withStreetAddress: number;
    shortTermApps: number;
    longTermApps: number;
    serviceEnded: number;
    donations: number;
  };
}

/**
 * Merge board people into one ContactListItem[] keyed by email when possible,
 * then combine remaining same-person duplicates. Mass-compiles mailing address
 * from Contacts + short-term + long-term sources.
 */
export function compileContactsFromBoards(
  input: CompileContactsFromBoardsInput,
): CompileContactsFromBoardsResult {
  const byEmail = new Map<string, MutableContact>();
  const withoutEmail: MutableContact[] = [];

  const upsert = (patch: {
    email?: string | null;
    name?: string;
    phone?: string;
    profilePhotoUrl?: string;
    createdAt?: string;
    tags?: ContactTag[];
    demographics?: ContactListDemographics;
    preferId?: string;
    onContactsBoard?: boolean;
  }) => {
    const email = usableEmail(patch.email ?? undefined);
    const tags = patch.tags ?? [];
    const name = patch.name?.trim() || '';
    const demographics = normalizeContactDemographics(patch.demographics);

    if (email) {
      const key = normalizeEmail(email);
      const existing = byEmail.get(key);
      if (!existing) {
        byEmail.set(key, {
          id:
            patch.onContactsBoard &&
            patch.preferId &&
            !isCompiledContactId(patch.preferId)
              ? patch.preferId
              : compiledId('email', email),
          name: name || email,
          email,
          phone: patch.phone?.trim() || undefined,
          profilePhotoUrl: patch.profilePhotoUrl,
          createdAt: patch.createdAt,
          tags: [...tags],
          demographics,
          onContactsBoard: Boolean(patch.onContactsBoard),
        });
        return;
      }

      if (patch.onContactsBoard && !existing.onContactsBoard && patch.preferId) {
        existing.id = patch.preferId;
        existing.onContactsBoard = true;
      }
      if (name && (existing.name === existing.email || !existing.name.trim())) {
        existing.name = name;
      } else if (
        name &&
        existing.onContactsBoard === false &&
        patch.onContactsBoard
      ) {
        existing.name = name;
      }
      if (!existing.phone && patch.phone?.trim()) {
        existing.phone = patch.phone.trim();
      }
      if (!existing.profilePhotoUrl && patch.profilePhotoUrl) {
        existing.profilePhotoUrl = patch.profilePhotoUrl;
      }
      if (!existing.createdAt && patch.createdAt) {
        existing.createdAt = patch.createdAt;
      }
      existing.tags = mergeTags(existing.tags, tags);
      existing.demographics = mergeRichestDemographics(
        existing.demographics,
        demographics,
      );
      return;
    }

    // No email — still keep the person so tag filters include everyone
    // with that role (apps / donations / Contacts), not only emailed rows.
    if (!name && !(patch.onContactsBoard && patch.preferId)) {
      return;
    }

    const id =
      patch.onContactsBoard && patch.preferId
        ? patch.preferId
        : patch.preferId && !isCompiledContactId(patch.preferId)
          ? compiledId('item', patch.preferId)
          : compiledId('name', name || 'unknown');

    const candidate: MutableContact = {
      id,
      name: name || 'Unknown contact',
      email: '—',
      phone: patch.phone?.trim() || undefined,
      profilePhotoUrl: patch.profilePhotoUrl,
      createdAt: patch.createdAt,
      tags: [...tags],
      demographics,
      onContactsBoard: Boolean(patch.onContactsBoard),
    };

    const nameKey = normalizePersonName(candidate.name);
    const phoneKey = normalizePhoneDigits(candidate.phone);
    for (const existing of withoutEmail) {
      if (existing.id === candidate.id) {
        absorbContact(existing, candidate);
        return;
      }
      if (
        isSyntheticRoleName(candidate.name) ||
        isSyntheticRoleName(existing.name)
      ) {
        continue;
      }
      if (!nameKey || normalizePersonName(existing.name) !== nameKey) {
        continue;
      }
      const existingPhone = normalizePhoneDigits(existing.phone);
      const phonesMatch =
        phoneKey.length >= 7 &&
        existingPhone.length >= 7 &&
        phoneKey === existingPhone;
      const bothLackPhone = phoneKey.length < 7 && existingPhone.length < 7;
      if (phonesMatch || bothLackPhone) {
        absorbContact(existing, candidate);
        return;
      }
    }

    withoutEmail.push(candidate);
  };

  for (const contact of input.contacts) {
    upsert({
      email: contact.email,
      name: contact.name,
      phone: contact.phone,
      profilePhotoUrl: contact.profilePhotoUrl,
      createdAt: contact.createdAt,
      tags: contact.tags,
      demographics: contact.demographics,
      preferId: contact.id,
      onContactsBoard: true,
    });
  }

  for (const app of input.shortTermApplications ?? []) {
    const volunteerEmail = getColumnText(app.column_values, 'email');
    const parentEmail = getColumnText(app.column_values, 'parentEmail');
    const pastorEmail = getColumnText(app.column_values, 'pastorEmail');
    const phone = getColumnText(app.column_values, 'phone');
    const volunteerName = volunteerNameFromItemTitle(app.name ?? '') || app.name;
    const demographics = resolveApplicationDemographics(app.column_values);

    upsert({
      email: volunteerEmail,
      name: volunteerName,
      phone,
      tags: ['volunteer'],
      demographics,
      preferId: app.id,
    });
    if (parentEmail) {
      upsert({
        email: parentEmail,
        name: `Parent of ${volunteerName}`,
        tags: ['parent'],
      });
    }
    if (pastorEmail) {
      upsert({
        email: pastorEmail,
        name: `Pastor for ${volunteerName}`,
        tags: ['pastor'],
      });
    }
  }

  for (const app of input.longTermApplications ?? []) {
    const email = getLongtermText(app.column_values, 'email');
    const phone = getLongtermText(app.column_values, 'phone');
    const homeAddress = getLongtermText(app.column_values, 'homeAddress');
    const dateOfBirth = normalizeDateOfBirth(
      getLongtermDateText(app.column_values, 'birthDate'),
    );
    const fromHome = homeAddress
      ? homeAddress.includes('\n')
        ? parseFilloutAddress(homeAddress)
        : { address: homeAddress }
      : undefined;
    const demographics = normalizeContactDemographics({
      ...(dateOfBirth ? { dateOfBirth } : {}),
      ...(fromHome ?? {}),
    });

    upsert({
      email,
      name: volunteerNameFromItemTitle(app.name ?? '') || app.name,
      phone,
      tags: ['volunteer'],
      demographics,
      preferId: app.id,
    });
  }

  for (const item of input.serviceEndedItems ?? []) {
    const email = getServiceEndedColumnText(item.column_values, 'email');
    const phone = getServiceEndedColumnText(item.column_values, 'phone');
    const parentEmail = getServiceEndedColumnText(
      item.column_values,
      'parentEmail',
    );
    const pastorEmail = getServiceEndedColumnText(
      item.column_values,
      'pastorEmail',
    );
    const volunteerName =
      volunteerNameFromItemTitle(item.name ?? '') || item.name;
    const dateOfBirth = normalizeDateOfBirth(
      getServiceEndedDateText(item.column_values, 'dateOfBirth'),
    );
    const demographics = normalizeContactDemographics(
      dateOfBirth ? { dateOfBirth } : undefined,
    );

    upsert({
      email,
      name: volunteerName,
      phone,
      tags: ['volunteer'],
      demographics,
      preferId: item.id,
    });
    if (parentEmail) {
      upsert({
        email: parentEmail,
        name: `Parent of ${volunteerName}`,
        tags: ['parent'],
      });
    }
    if (pastorEmail) {
      upsert({
        email: pastorEmail,
        name: `Pastor for ${volunteerName}`,
        tags: ['pastor'],
      });
    }
  }

  for (const item of input.donationItems ?? []) {
    const email = getDonationColumnText(item.column_values, 'donorEmail');
    const donorName =
      getDonationColumnText(item.column_values, 'donorName') || item.name;
    upsert({
      email,
      name: donorName,
      tags: ['donor'],
      preferId: item.id,
    });
  }

  const combined = combineSamePeople([
    ...byEmail.values(),
    ...withoutEmail,
  ]);

  const compiled = combined.contacts.map(toListItem);
  compiled.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );

  const fromContactsBoard = compiled.filter(
    (contact) => !isCompiledContactId(contact.id),
  ).length;
  const withStreetAddress = compiled.filter((contact) =>
    Boolean(contact.demographics?.address?.trim()),
  ).length;

  return {
    contacts: compiled,
    stats: {
      fromContactsBoard,
      addedFromOtherBoards: compiled.length - fromContactsBoard,
      mergedDuplicates: combined.mergedDuplicates,
      withStreetAddress,
      shortTermApps: input.shortTermApplications?.length ?? 0,
      longTermApps: input.longTermApplications?.length ?? 0,
      serviceEnded: input.serviceEndedItems?.length ?? 0,
      donations: input.donationItems?.length ?? 0,
    },
  };
}
