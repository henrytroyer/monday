/**
 * contactUpsert.ts — Create or update a Monday Contacts item from an incoming person.
 * Strong matches auto-apply; fuzzy matches enqueue Match Review.
 */

import {
  canEditContacts,
  resolveContactsBoardId,
  useMockData,
} from '../../config/boards';
import { contactMap } from '../../config/contactMap';
import type {
  ContactListDemographics,
  ContactListItem,
  ContactTag,
} from '../../types/contact';
import { changeColumnByTitle } from '../mondayColumnWrite';
import { createContactOnMonday } from '../createContactOnMonday';
import {
  updateContactFieldsOnMonday,
  updateContactPastorReferenceOnMonday,
  updateContactTagsOnMonday,
} from '../crmApi';
import { upsertContactByEmail } from '../contactSyncHelpers';
import { mergeTags } from '../contactSyncHelpers';
import { isCompiledContactId } from '../compileContactsFromBoards';
import {
  matchContact,
  normalizeEmail,
  type IncomingPersonIdentity,
} from './contactMatch';
import { enqueueContactMatchReview } from './contactMatchReviewStorage';

export interface ContactUpsertInput extends IncomingPersonIdentity {
  tags: ContactTag[];
  demographics?: ContactListDemographics;
  /** Pastor fields to write onto a volunteer contact (current pastor). */
  pastorOnVolunteer?: {
    name?: string;
    email?: string;
    phone?: string;
    church?: string;
  };
  /** Parent snapshot fields on volunteer contact. */
  parentOnVolunteer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  /** Spouse snapshot on volunteer contact. */
  spouseOnVolunteer?: {
    name?: string;
    email?: string;
  };
  /** Emergency fields on volunteer only (never creates a contact). */
  emergencyOnVolunteer?: {
    name?: string;
    phone?: string;
  };
  /** Append to Connected to: text (couple partner, pastor names, etc.). */
  connectedToLabels?: string[];
  source: string;
  sourceItemId?: string;
  /** When set, skip matching and update this contact id. */
  forceContactId?: string;
  /** When true, create even if fuzzy match exists (review rejected). */
  forceCreate?: boolean;
}

export type ContactUpsertAction =
  | 'created'
  | 'updated'
  | 'queued_review'
  | 'skipped';

export interface ContactUpsertResult {
  action: ContactUpsertAction;
  contact?: ContactListItem;
  reviewId?: string;
  message: string;
}

function preferNonEmpty(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const e = existing?.trim();
  const i = incoming?.trim();
  if (i) return i;
  if (e) return e;
  return undefined;
}

function mergeDemographics(
  existing?: ContactListDemographics,
  incoming?: ContactListDemographics,
): ContactListDemographics | undefined {
  if (!existing && !incoming) return undefined;
  const merged = {
    address: preferNonEmpty(existing?.address, incoming?.address),
    city: preferNonEmpty(existing?.city, incoming?.city),
    state: preferNonEmpty(existing?.state, incoming?.state),
    zip: preferNonEmpty(existing?.zip, incoming?.zip),
    country: preferNonEmpty(existing?.country, incoming?.country),
  };
  if (
    !merged.address &&
    !merged.city &&
    !merged.state &&
    !merged.zip &&
    !merged.country
  ) {
    return undefined;
  }
  return merged;
}

async function writeExtraContactFields(
  boardId: string,
  itemId: string,
  input: ContactUpsertInput,
  existingConnectedTo?: string,
): Promise<void> {
  const writes: Array<[string, string]> = [];

  if (input.parentOnVolunteer) {
    if (input.parentOnVolunteer.name) {
      writes.push([contactMap.parentName, input.parentOnVolunteer.name]);
    }
    if (input.parentOnVolunteer.email) {
      writes.push([contactMap.parentEmail, input.parentOnVolunteer.email]);
    }
    if (input.parentOnVolunteer.phone) {
      writes.push([contactMap.parentPhone, input.parentOnVolunteer.phone]);
    }
  }

  if (input.spouseOnVolunteer) {
    if (input.spouseOnVolunteer.name) {
      writes.push([contactMap.spouseName, input.spouseOnVolunteer.name]);
    }
    if (input.spouseOnVolunteer.email) {
      writes.push([contactMap.spouseEmail, input.spouseOnVolunteer.email]);
    }
  }

  if (input.emergencyOnVolunteer) {
    if (input.emergencyOnVolunteer.name) {
      writes.push([
        contactMap.emergencyContact,
        input.emergencyOnVolunteer.name,
      ]);
    }
    if (input.emergencyOnVolunteer.phone) {
      writes.push([
        contactMap.emergencyPhone,
        input.emergencyOnVolunteer.phone,
      ]);
    }
  }

  if (input.connectedToLabels?.length) {
    const existing = (existingConnectedTo ?? '')
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean);
    const merged = [...new Set([...existing, ...input.connectedToLabels])];
    writes.push([contactMap.connectedTo, merged.join(', ')]);
  }

  for (const [title, value] of writes) {
    if (!value.trim()) continue;
    await changeColumnByTitle(boardId, itemId, title, value.trim()).catch(
      () => undefined,
    );
  }

  if (input.pastorOnVolunteer) {
    await updateContactPastorReferenceOnMonday(boardId, itemId, {
      name: input.pastorOnVolunteer.name,
      email: input.pastorOnVolunteer.email,
      phone: input.pastorOnVolunteer.phone,
      church: input.pastorOnVolunteer.church,
    }).catch(() => undefined);
  }
}

async function applyUpdate(
  boardId: string,
  existing: ContactListItem,
  input: ContactUpsertInput,
): Promise<ContactListItem> {
  if (isCompiledContactId(existing.id)) {
    // Compiled stub — create a real Contacts item instead.
    return applyCreate(input);
  }

  const tags = mergeTags(existing.tags, input.tags);
  const name = preferNonEmpty(existing.name, input.name) || existing.name;
  const email =
    preferNonEmpty(
      normalizeEmail(existing.email) ?? undefined,
      normalizeEmail(input.email) ?? undefined,
    ) || existing.email;
  const phone = preferNonEmpty(existing.phone, input.phone ?? undefined);
  const demographics = mergeDemographics(
    existing.demographics,
    input.demographics,
  );

  await updateContactFieldsOnMonday(boardId, existing.id, {
    name,
    email: email === '—' ? '' : email,
    phone,
    demographics,
  });
  await updateContactTagsOnMonday(boardId, existing.id, tags);
  await writeExtraContactFields(
    boardId,
    existing.id,
    input,
    existing.connectedTo,
  );

  const connectedTo = input.connectedToLabels?.length
    ? [
        ...new Set([
          ...(existing.connectedTo ?? '')
            .split(/[,;]/)
            .map((part) => part.trim())
            .filter(Boolean),
          ...input.connectedToLabels,
        ]),
      ].join(', ')
    : existing.connectedTo;

  return {
    ...existing,
    name,
    email: email || '—',
    phone,
    tags,
    demographics,
    ...(connectedTo ? { connectedTo } : {}),
    ...(input.spouseOnVolunteer?.name
      ? { spouseName: input.spouseOnVolunteer.name }
      : {}),
    ...(input.pastorOnVolunteer?.name
      ? { pastorName: input.pastorOnVolunteer.name }
      : {}),
  };
}

async function applyCreate(
  input: ContactUpsertInput,
): Promise<ContactListItem> {
  const created = await createContactOnMonday({
    name: input.name.trim() || 'New contact',
    email: normalizeEmail(input.email) || '—',
    phone: input.phone?.trim() || undefined,
    tags: input.tags,
  });

  const boardId = resolveContactsBoardId();
  if (boardId && !useMockData()) {
    if (input.demographics) {
      await updateContactFieldsOnMonday(boardId, created.id, {
        name: created.name,
        email: created.email === '—' ? '' : created.email,
        phone: created.phone,
        demographics: input.demographics,
      }).catch(() => undefined);
    }
    await writeExtraContactFields(boardId, created.id, input);
  }

  return {
    ...created,
    demographics: input.demographics,
  };
}

/**
 * Upsert a person onto the Contacts board.
 * @param contacts Current compiled/list contacts used for matching.
 */
export async function upsertContactPerson(
  input: ContactUpsertInput,
  contacts: ContactListItem[],
): Promise<ContactUpsertResult> {
  const name = input.name.trim();
  if (!name) {
    return { action: 'skipped', message: 'Missing name' };
  }

  if (useMockData()) {
    const mock = upsertContactByEmail({
      name,
      email: normalizeEmail(input.email) || '—',
      phone: input.phone?.trim(),
      tags: input.tags,
    });
    return { action: 'updated', contact: mock, message: 'Mock upsert' };
  }

  if (!canEditContacts()) {
    return { action: 'skipped', message: 'Contacts are read-only' };
  }

  const boardId = resolveContactsBoardId();
  if (!boardId) {
    return { action: 'skipped', message: 'Contacts board not configured' };
  }

  if (input.forceContactId) {
    const existing =
      contacts.find((c) => c.id === input.forceContactId) ??
      ({
        id: input.forceContactId,
        name,
        email: normalizeEmail(input.email) || '—',
        tags: input.tags,
      } satisfies ContactListItem);
    const contact = await applyUpdate(boardId, existing, input);
    return { action: 'updated', contact, message: 'Updated forced contact' };
  }

  if (input.forceCreate) {
    const contact = await applyCreate(input);
    return { action: 'created', contact, message: 'Created (forced)' };
  }

  const match = matchContact(input, contacts);
  if (match.needsReview) {
    const review = enqueueContactMatchReview({
      source: input.source,
      sourceItemId: input.sourceItemId,
      incoming: {
        name,
        email: normalizeEmail(input.email) ?? undefined,
        phone: input.phone?.trim() || undefined,
        tags: input.tags,
        city: input.city ?? input.demographics?.city,
        address: input.address ?? input.demographics?.address,
        zip: input.zip ?? input.demographics?.zip,
      },
      candidates: match.candidates.map((candidate) => ({
        contactId: candidate.contact.id,
        contactName: candidate.contact.name,
        contactEmail: candidate.contact.email,
        tier: candidate.tier,
        score: candidate.score,
      })),
    });
    return {
      action: 'queued_review',
      reviewId: review.id,
      message: `Queued match review (${match.tier})`,
    };
  }

  if (match.match) {
    const contact = await applyUpdate(boardId, match.match, input);
    return {
      action: 'updated',
      contact,
      message: `Updated via ${match.tier}`,
    };
  }

  const contact = await applyCreate(input);
  return { action: 'created', contact, message: 'Created new contact' };
}

/** Append a connected-to label on an existing contact (pastor/couple links). */
export async function appendConnectedToLabel(
  contactId: string,
  label: string,
): Promise<void> {
  if (useMockData() || !canEditContacts()) return;
  const boardId = resolveContactsBoardId();
  if (!boardId || !label.trim()) return;
  await changeColumnByTitle(
    boardId,
    contactId,
    contactMap.connectedTo,
    label.trim(),
  ).catch(() => undefined);
}
