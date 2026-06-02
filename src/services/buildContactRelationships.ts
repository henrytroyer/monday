import { resolveTimelineId } from '../config/timelineMap';
import { getTimelineLabel } from '../data/timelines';
import type {
  ContactDetail,
  ContactListItem,
  CurrentApplicationSummary,
  LinkedVolunteerSummary,
} from '../types/contact';
import type { VolunteerTerm } from '../types/volunteer';
import { getColumnText, type MondayBoardItem } from './mapMondayToCrm';
import {
  getContactColumnText,
  mapItemToContactListItem,
  parseLinkedApplicationIds,
  type MondayContactItem,
} from './mapMondayToContact';
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isStepComplete(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v === 'done' ||
    v === 'complete' ||
    v === 'completed' ||
    v === 'yes' ||
    v === 'paid' ||
    v === 'received'
  );
}

function mapApplicationToTerm(item: MondayBoardItem): VolunteerTerm {
  const timelineLabel = getColumnText(item.column_values, 'signupTimeline');
  const timelineId = resolveTimelineId(timelineLabel);
  const status = getColumnText(item.column_values, 'status') || '—';
  const pastorReference = getColumnText(item.column_values, 'pastorReference');

  return {
    itemId: item.id,
    timelineId,
    timelineLabel: getTimelineLabel(timelineId) || timelineLabel || '—',
    termStart: getColumnText(item.column_values, 'arrivalDate') || undefined,
    termEnd: getColumnText(item.column_values, 'departureDate') || undefined,
    status,
    pipelineStage: item.group?.title ?? '—',
    quickbooksInvoiceId:
      getColumnText(item.column_values, 'quickbooksInvoiceId') || undefined,
    pastorReferenceStatus: pastorReference
      ? isStepComplete(pastorReference)
        ? 'Complete'
        : 'Pending'
      : undefined,
    locationPreference:
      getColumnText(item.column_values, 'locationPreference') ||
      getColumnText(item.column_values, 'location') ||
      undefined,
    notes: [],
  };
}

export interface ContactRelationshipContext {
  applications: MondayBoardItem[];
  contactByEmail: Map<string, ContactListItem>;
}

export function buildContactByEmailIndex(
  contacts: ContactListItem[],
): Map<string, ContactListItem> {
  const map = new Map<string, ContactListItem>();
  for (const contact of contacts) {
    if (contact.email && contact.email !== '—') {
      map.set(normalizeEmail(contact.email), contact);
    }
  }
  return map;
}

export function enrichContactDetail(
  contactItem: MondayContactItem,
  applications: MondayBoardItem[],
  allContacts: ContactListItem[],
): Omit<
  ContactDetail,
  keyof ContactListItem | 'donations'
> {
  const base = mapItemToContactListItem(contactItem);
  const emailNorm = normalizeEmail(base.email);
  const linkedAppIds = parseLinkedApplicationIds(contactItem.column_values);

  const serviceTerms: VolunteerTerm[] = [];
  const linkedVolunteers: LinkedVolunteerSummary[] = [];
  let currentApplication: CurrentApplicationSummary | null = null;

  const contactByEmail = buildContactByEmailIndex(allContacts);

  for (const app of applications) {
    const volunteerEmail = normalizeEmail(
      getColumnText(app.column_values, 'email'),
    );
    const parentEmail = normalizeEmail(
      getColumnText(app.column_values, 'parentEmail'),
    );
    const pastorEmail = normalizeEmail(
      getColumnText(app.column_values, 'pastorEmail'),
    );
    const volunteerName = app.name;
    const term = mapApplicationToTerm(app);

    const isVolunteerApp =
      linkedAppIds.includes(app.id) || volunteerEmail === emailNorm;

    if (isVolunteerApp) {
      serviceTerms.push({ ...term, notes: [] });
      if (!currentApplication) {
        currentApplication = {
          itemId: app.id,
          stage: app.group?.title ?? '—',
          status: term.status ?? '—',
          timelineLabel: term.timelineLabel,
        };
      }
    }

    if (base.tags.includes('parent') && parentEmail === emailNorm) {
      linkedVolunteers.push({
        contactId: contactByEmail.get(volunteerEmail)?.id,
        applicationItemId: app.id,
        volunteerName,
        timelineLabel: term.timelineLabel,
        status: term.status ?? '—',
        pipelineStage: term.pipelineStage ?? '—',
        relationship: 'child',
      });
    }

    if (base.tags.includes('pastor') && pastorEmail === emailNorm) {
      linkedVolunteers.push({
        contactId: contactByEmail.get(volunteerEmail)?.id,
        applicationItemId: app.id,
        volunteerName,
        timelineLabel: term.timelineLabel,
        status: term.status ?? '—',
        pipelineStage: term.pipelineStage ?? '—',
        referenceStatus: term.pastorReferenceStatus,
        relationship: 'reference',
      });
    }
  }

  const demographics = {
    address: getContactColumnText(contactItem.column_values, 'address'),
    city: getContactColumnText(contactItem.column_values, 'city'),
    country: getContactColumnText(contactItem.column_values, 'country'),
    dateOfBirth: getContactColumnText(
      contactItem.column_values,
      'dateOfBirth',
    ),
  };

  const hasDemographics = Object.values(demographics).some(Boolean);

  return {
    quickbooksCustomerId:
      getContactColumnText(contactItem.column_values, 'quickbooksCustomerId') ||
      undefined,
    demographics: hasDemographics ? demographics : undefined,
    currentApplication,
    serviceTerms,
    linkedVolunteers,
  };
}
