import { LONGTERM_REFERENCE_SLOT_TYPES } from '../constants/longtermReferenceSlots';
import {
  LONGTERM_REFERENCE_EXCLUDED_TITLES,
  longtermReferenceMap,
} from '../config/longtermReferenceMap';
import { longtermRefereeSlotColumns } from '../config/longtermColumnMap';
import type {
  LongtermReferenceReviewStatus,
  LongtermReferenceSlot,
  LongtermReferenceStatus,
} from '../types/longtermReference';
import type { ApplicationFormField } from '../types/volunteer';
import type { MondayColumnValue } from './mapMondayToCrm';
import {
  getRefereeContactFromApplication,
} from './mapMondayToLongterm';
import {
  readReferenceEmailSentAt,
  readReferenceReviewStatus,
} from './longtermReferenceStorage';
import { normalizePersonName } from '../utils/personNameMatch';

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Match when reference form applicant name corresponds to the application item. */
function applicantNamesMatch(refName: string, appName: string): boolean {
  const a = normalizePersonName(refName);
  const b = normalizePersonName(appName);
  if (!a || !b) return false;
  if (a === b) return true;

  const aParts = a.split(' ').filter(Boolean);
  const bParts = b.split(' ').filter(Boolean);
  if (aParts.length < 2 || bParts.length < 2) return false;

  const aLast = aParts[aParts.length - 1]!;
  const bLast = bParts[bParts.length - 1]!;
  if (aLast !== bLast) return false;

  const aFirst = aParts[0]!;
  const bFirst = bParts[0]!;
  if (aFirst === bFirst) return true;
  // Katie/Kate, Jon/John, etc.
  const prefixLen = Math.min(3, aFirst.length, bFirst.length);
  return (
    prefixLen >= 2 &&
    aFirst.slice(0, prefixLen) === bFirst.slice(0, prefixLen)
  );
}

function refereeEmailOnApplication(
  refereeEmail: string,
  applicationColumns: MondayColumnValue[],
): boolean {
  const norm = normalizeEmail(refereeEmail);
  if (!norm) return false;
  for (let i = 0; i < 5; i++) {
    const contact = getRefereeContactFromApplication(applicationColumns, i);
    if (contact.email && normalizeEmail(contact.email) === norm) {
      return true;
    }
  }
  return false;
}

function referenceBelongsToApplication(
  item: MondayReferenceItem,
  applicationId: string,
  applicationColumns: MondayColumnValue[],
  applicantEmail: string,
  applicantName: string,
): boolean {
  const linkedIds = getLinkedApplicationIds(item.column_values);
  if (linkedIds.includes(applicationId)) return true;

  const refApplicantEmail = normalizeEmail(
    getReferenceColumnText(
      item.column_values,
      longtermReferenceMap.applicantEmail,
    ),
  );
  const applicantNorm = normalizeEmail(applicantEmail);
  if (refApplicantEmail && applicantNorm && refApplicantEmail === applicantNorm) {
    return true;
  }

  const refApplicantName = getReferenceColumnText(
    item.column_values,
    longtermReferenceMap.applicantName,
  );
  if (applicantNamesMatch(refApplicantName, applicantName)) {
    return true;
  }

  const refereeEmail = getReferenceColumnText(
    item.column_values,
    longtermReferenceMap.refereeEmail,
  );
  if (refereeEmailOnApplication(refereeEmail, applicationColumns)) {
    return true;
  }

  return false;
}

const SKIP_COLUMN_TYPES = new Set([
  'subtasks',
  'board_relation',
  'mirror',
  'auto_number',
  'creation_log',
  'last_updated',
  'item_id',
  'formula',
]);

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function formatColumnAnswer(col: MondayColumnValue): string {
  const text = col.text?.trim();
  if (text) return text;
  if (!col.value) return '';
  try {
    const parsed = JSON.parse(col.value) as Record<string, unknown>;
    if (typeof parsed.text === 'string' && parsed.text.trim()) {
      return parsed.text.trim();
    }
    if (typeof parsed.label === 'string' && parsed.label.trim()) {
      return parsed.label.trim();
    }
    if (Array.isArray(parsed.labels) && parsed.labels.length > 0) {
      return parsed.labels.map(String).join(', ');
    }
    if (typeof parsed.email === 'string') return parsed.email;
    if (parsed.date) return String(parsed.date);
  } catch {
    // fall through
  }
  return '';
}

export function buildLongtermReferenceBoardFormFields(
  columnValues: MondayColumnValue[],
): ApplicationFormField[] {
  const fields: ApplicationFormField[] = [];
  for (const col of columnValues) {
    const title = columnTitle(col);
    if (!title) continue;
    if (SKIP_COLUMN_TYPES.has(col.type)) continue;
    if (LONGTERM_REFERENCE_EXCLUDED_TITLES.has(normalizeTitle(title))) continue;

    const answer = formatColumnAnswer(col);
    if (!answer.trim()) continue;

    fields.push({
      id: col.id,
      question: title,
      answer,
      columnType: col.type,
    });
  }
  return fields;
}

export interface MondayReferenceItem {
  id: string;
  name: string;
  created_at?: string;
  column_values: MondayColumnValue[];
}

function getReferenceColumnText(
  columnValues: MondayColumnValue[],
  title: string,
): string {
  const col = columnValues.find(
    (c) => normalizeTitle(columnTitle(c)) === normalizeTitle(title),
  );
  return col?.text?.trim() || formatColumnAnswer(col!) || '';
}

function getLinkedApplicationIds(columnValues: MondayColumnValue[]): string[] {
  const linkTitle = normalizeTitle(longtermReferenceMap.applicationLink);
  const col = columnValues.find(
    (c) => normalizeTitle(columnTitle(c)) === linkTitle,
  );
  if (!col) return [];
  if (col.linked_item_ids?.length) {
    return col.linked_item_ids.map(String);
  }
  if (col.value) {
    try {
      const parsed = JSON.parse(col.value) as { linkedPulseIds?: number[] };
      return (parsed.linkedPulseIds ?? []).map(String);
    } catch {
      return [];
    }
  }
  return [];
}

function relationshipToSlotIndex(relationship: string): number | null {
  const r = relationship.toLowerCase();
  if (r.includes('employer') || r.includes('supervisor')) return 1;
  if (r.includes('pastor') && !r.includes('youth')) return 2;
  if (r.includes('youth') || r.includes('mentor')) return 3;
  if (
    r.includes('parent') ||
    r.includes('mother') ||
    r.includes('father') ||
    r.includes('guardian')
  ) {
    return 4;
  }
  if (r.includes('friend') || r.includes('other')) return 0;
  return null;
}

function resolveSlotStatus(
  applicationId: string,
  slotIndex: number,
  hasReceived: boolean,
  hasRefereeContact: boolean,
  reviewStatus?: LongtermReferenceReviewStatus,
): LongtermReferenceStatus {
  const sentAt = readReferenceEmailSentAt(applicationId, slotIndex);

  if (reviewStatus === 'approved') return 'approved';
  if (reviewStatus === 'needs_review') return 'needs_review';

  if (hasReceived) {
    return reviewStatus ? 'pending_review' : 'pending_review';
  }

  if (sentAt) return 'sent';
  if (hasRefereeContact) return 'placeholder';
  return 'placeholder';
}

function matchReferenceToSlot(
  relationship: string,
  usedSlots: Set<number>,
  applicationColumns: MondayColumnValue[],
): number | null {
  const relSlot = relationshipToSlotIndex(relationship);
  if (relSlot === null || usedSlots.has(relSlot)) return null;

  const contact = getRefereeContactFromApplication(applicationColumns, relSlot);
  const hasContact = Boolean(
    contact.name || contact.email || contact.phone || contact.linkedItemId,
  );
  return hasContact ? relSlot : null;
}

function slotHasApplicationContact(
  applicationColumns: MondayColumnValue[],
  slotIndex: number,
): boolean {
  const contact = getRefereeContactFromApplication(applicationColumns, slotIndex);
  return Boolean(
    contact.name || contact.email || contact.phone || contact.linkedItemId,
  );
}

export function buildReferenceSlotsFromMonday(
  applicationId: string,
  applicationColumns: MondayColumnValue[],
  referenceItems: MondayReferenceItem[],
  linkedReferenceItems: Map<string, MondayReferenceItem>,
  applicantEmail: string,
  applicantName: string,
): LongtermReferenceSlot[] {
  const usedSlots = new Set<number>();
  const usedItemIds = new Set<string>();
  const slotReceived = new Map<
    number,
    { item: MondayReferenceItem; formFields: ApplicationFormField[] }
  >();

  const relevantRefs = referenceItems.filter((item) =>
    referenceBelongsToApplication(
      item,
      applicationId,
      applicationColumns,
      applicantEmail,
      applicantName,
    ),
  );

  for (const item of relevantRefs) {
    const refereeEmail = normalizeEmail(
      getReferenceColumnText(item.column_values, longtermReferenceMap.refereeEmail),
    );
    const relationship = getReferenceColumnText(
      item.column_values,
      longtermReferenceMap.relationship,
    );
    const formFields = buildLongtermReferenceBoardFormFields(item.column_values);
    if (formFields.length === 0) continue;

    let slotIndex: number | null = null;
    for (let i = 0; i < 5; i++) {
      if (usedSlots.has(i)) continue;
      const contact = getRefereeContactFromApplication(applicationColumns, i);
      if (
        contact.email &&
        refereeEmail &&
        normalizeEmail(contact.email) === refereeEmail
      ) {
        slotIndex = i;
        break;
      }
    }

    if (slotIndex === null) {
      slotIndex = matchReferenceToSlot(
        relationship,
        usedSlots,
        applicationColumns,
      );
    }

    if (slotIndex === null) continue;
    usedSlots.add(slotIndex);
    usedItemIds.add(item.id);
    slotReceived.set(slotIndex, { item, formFields });
  }

  for (let slotIndex = 0; slotIndex < 5; slotIndex++) {
    const slotConfig = longtermRefereeSlotColumns[slotIndex];
    if (!('relationColumnId' in slotConfig) || !slotConfig.relationColumnId) {
      continue;
    }
    const contact = getRefereeContactFromApplication(applicationColumns, slotIndex);
    if (!contact.linkedItemId || usedSlots.has(slotIndex)) continue;
    if (usedItemIds.has(contact.linkedItemId)) continue;
    const linked = linkedReferenceItems.get(contact.linkedItemId);
    if (!linked) continue;
    const formFields = buildLongtermReferenceBoardFormFields(linked.column_values);
    if (formFields.length === 0) continue;
    usedSlots.add(slotIndex);
    usedItemIds.add(linked.id);
    slotReceived.set(slotIndex, { item: linked, formFields });
  }

  return LONGTERM_REFERENCE_SLOT_TYPES.map((type, slotIndex) => {
    const slotConfig = longtermRefereeSlotColumns[slotIndex]!;
    const contact = getRefereeContactFromApplication(applicationColumns, slotIndex);
    const hasApplicationContact = slotHasApplicationContact(
      applicationColumns,
      slotIndex,
    );
    const received = hasApplicationContact
      ? slotReceived.get(slotIndex)
      : undefined;
    const reviewStatus = readReferenceReviewStatus(applicationId, slotIndex);
    const hasReceived = Boolean(received && received.formFields.length > 0);

    let status = resolveSlotStatus(
      applicationId,
      slotIndex,
      hasReceived,
      hasApplicationContact,
      reviewStatus,
    );

    if (hasReceived && !reviewStatus) {
      status = 'pending_review';
    }

    if (!hasApplicationContact) {
      status = 'placeholder';
    }

    const slot: LongtermReferenceSlot = {
      slotIndex,
      type,
      status,
      slotLabel: slotConfig.label,
      refereeName: contact.name || undefined,
      refereeEmail: contact.email || undefined,
    };

    if (received && hasReceived) {
      slot.mondayItemId = received.item.id;
      slot.mondayBoardId =
        slotIndex === 1
          ? longtermReferenceMap.employerBoardId
          : longtermReferenceMap.boardId;
      slot.formFields = received.formFields;
      if (!slot.refereeName) {
        slot.refereeName = received.item.name;
      }
      if (!slot.refereeEmail) {
        slot.refereeEmail = getReferenceColumnText(
          received.item.column_values,
          longtermReferenceMap.refereeEmail,
        );
      }
      slot.receivedAt = received.item.created_at
        ? new Date(received.item.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : undefined;
    }

    const sentAt = readReferenceEmailSentAt(applicationId, slotIndex);
    if (sentAt) slot.emailSentAt = sentAt;
    if (reviewStatus) slot.reviewStatus = reviewStatus;

    return slot;
  });
}
