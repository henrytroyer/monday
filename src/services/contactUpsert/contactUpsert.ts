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
  ContactDemographics,
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
import {
  mergeDemographicsByMode,
  mergeFieldByMode,
  resolveContactFieldMergeMode,
  type ContactFieldMergeMode,
} from './fieldMerge';

export type { ContactFieldMergeMode } from './fieldMerge';

export interface ContactUpsertInput extends IncomingPersonIdentity {
  tags: ContactTag[];
  /** Mailing + optional DOB (written to Contacts date column when present). */
  demographics?: ContactDemographics;
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
  /**
   * When true, non-empty incoming values replace existing (CSE refresh).
   * Default false = fill gaps only (existing wins when both set).
   * Prefer `mergeMode` for new callers; this remains for CSE.
   */
  preferIncoming?: boolean;
  /**
   * Field merge strategy. Default fill-gaps.
   * `richest` is used by Fillout contact builder only.
   */
  mergeMode?: ContactFieldMergeMode;
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

  const mergeMode = resolveContactFieldMergeMode(input);
  const tags = mergeTags(existing.tags, input.tags);
  const name =
    mergeFieldByMode(existing.name, input.name, mergeMode) || existing.name;
  const email =
    mergeFieldByMode(
      normalizeEmail(existing.email) ?? undefined,
      normalizeEmail(input.email) ?? undefined,
      mergeMode,
    ) || existing.email;
  const phone = mergeFieldByMode(
    existing.phone,
    input.phone ?? undefined,
    mergeMode,
  );
  const demographics = mergeDemographicsByMode(
    existing.demographics,
    input.demographics,
    mergeMode,
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

  const listDemographics = demographics
    ? {
        address: demographics.address,
        city: demographics.city,
        state: demographics.state,
        zip: demographics.zip,
        country: demographics.country,
      }
    : undefined;

  return {
    ...existing,
    name,
    email: email || '—',
    phone,
    tags,
    demographics: listDemographics,
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

  const listDemographics = input.demographics
    ? {
        address: input.demographics.address,
        city: input.demographics.city,
        state: input.demographics.state,
        zip: input.demographics.zip,
        country: input.demographics.country,
      }
    : undefined;

  return {
    ...created,
    demographics: listDemographics,
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
    // Ambiguous email: auto-pick best survivor when scores clearly favor one
    // Contacts-board candidate; otherwise queue Match Review.
    const ranked = [...match.candidates].sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    const bestIsBoard =
      best && !isCompiledContactId(best.contact.id);
    const clearWinner =
      match.tier === 'email' &&
      best &&
      bestIsBoard &&
      (!second || best.score > second.score);

    if (clearWinner && best) {
      const contact = await applyUpdate(boardId, best.contact, input);
      return {
        action: 'updated',
        contact,
        message: `Updated best email match (${best.contact.id})`,
      };
    }

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
  existingConnectedTo?: string,
): Promise<void> {
  if (useMockData() || !canEditContacts()) return;
  const boardId = resolveContactsBoardId();
  if (!boardId || !label.trim()) return;
  const existing = (existingConnectedTo ?? '')
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const merged = [...new Set([...existing, label.trim()])].join(', ');
  await changeColumnByTitle(
    boardId,
    contactId,
    contactMap.connectedTo,
    merged,
  ).catch(() => undefined);
}
