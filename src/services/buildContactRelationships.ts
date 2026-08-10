import { resolveTimelineId } from '../config/timelineMap';
import { getTimelineLabel } from '../data/timelines';
import type {
  ContactDetail,
  ContactListItem,
  CurrentApplicationSummary,
  LinkedVolunteerSummary,
} from '../types/contact';
import type { VolunteerTerm, VolunteerFile } from '../types/volunteer';
import { getColumnText, getColumnDateText, getApplicationFilesFromColumns, type MondayBoardItem } from './mapMondayToCrm';
import { getArrivalDepartureTimelineRange } from './mondayTimelineColumn';
import { normalizeDateOfBirth } from '../utils/formatDateOfBirth';
import { mergeContactAndApplicationDemographics } from '../utils/formatContactAddress';
import {
  resolveApplicationDemographics,
} from '../utils/applicationDemographics';
import {
  getContactColumnDateText,
  getContactColumnText,
  getContactFilesFromColumns,
  getContactPassportFile,
  mapContactPastorReference,
  mapItemToContactListItem,
  parseLinkedApplicationIds,
  parseLinkedDonationItemIds,
  parseLinkedServiceEndedIds,
  type MondayContactItem,
} from './mapMondayToContact';
import {
  deriveDetailRoleTags,
  deriveTagsFromContactRelations,
} from './contactRoleTags';
import {
  getServiceEndedColumnText,
  mapServiceEndedItemToTerm,
  parseLinkedContactIdsFromServiceEnded,
} from './mapServiceEndedToTerm';
import { isServiceEndedTerm } from './contactServiceRecordStorage';
import { matchEndOfServiceReviewsForContact } from './matchEndOfServiceReviews';
import {
  parseFlexibleDate,
  resolveVolunteerTermDateRange,
  type VolunteerTermDateRange,
} from '../utils/volunteerTerm';
function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed === '—') return '';
  return trimmed;
}

/** Primary + Alt Email addresses for matching parent/pastor links. */
function contactMatchEmails(contact: {
  email?: string;
  altEmail?: string;
}): Set<string> {
  const emails = new Set<string>();
  const primary = normalizeEmail(contact.email);
  if (primary) emails.add(primary);
  for (const part of (contact.altEmail ?? '').split(/[,;]/)) {
    const email = normalizeEmail(part);
    if (email) emails.add(email);
  }
  return emails;
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
  const termRange = getArrivalDepartureTimelineRange(item.column_values);

  return {
    itemId: item.id,
    timelineId,
    timelineLabel: getTimelineLabel(timelineId) || timelineLabel || '—',
    termStart:
      getColumnDateText(item.column_values, 'arrivalDate') ||
      termRange?.from ||
      undefined,
    termEnd:
      getColumnDateText(item.column_values, 'departureDate') ||
      termRange?.to ||
      undefined,
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

function parseTermEndSortKey(termEnd?: string): number {
  if (!termEnd?.trim()) return 0;
  const parsed = Date.parse(termEnd);
  return Number.isFinite(parsed) ? parsed : 0;
}

function termToVolunteerAdapter(term: VolunteerTerm) {
  return {
    id: term.itemId,
    name: '',
    locationPreference: term.locationPreference ?? '',
    location: '',
    status: term.status ?? '',
    timelineId: term.timelineId,
    preferredDates: term.timelineLabel,
    termStart: term.termStart,
    termEnd: term.termEnd,
    pipelineStage: term.pipelineStage,
  };
}

function resolveTermDateRange(term: VolunteerTerm): VolunteerTermDateRange | null {
  return resolveVolunteerTermDateRange(termToVolunteerAdapter(term));
}

function dateRangesOverlap(
  a: VolunteerTermDateRange,
  b: VolunteerTermDateRange,
): boolean {
  return a.start.getTime() <= b.end.getTime() && b.start.getTime() <= a.end.getTime();
}

function endedTermOverlapsApplication(
  endedTerm: VolunteerTerm,
  applicationTerm: VolunteerTerm,
): boolean {
  const endedRange = resolveTermDateRange(endedTerm);
  const appRange = resolveTermDateRange(applicationTerm);
  if (endedRange && appRange) {
    return dateRangesOverlap(endedRange, appRange);
  }

  const endedEnd = parseFlexibleDate(endedTerm.termEnd);
  const appEnd = parseFlexibleDate(applicationTerm.termEnd);
  if (endedEnd && appEnd) {
    return Math.abs(endedEnd.getTime() - appEnd.getTime()) <= 14 * 86_400_000;
  }

  return (
    endedTerm.timelineId === applicationTerm.timelineId &&
    endedTerm.timelineId !== 'recruitment'
  );
}

function mergeServiceEndedTerms(
  applicationTerms: VolunteerTerm[],
  serviceEndedItems: MondayBoardItem[],
  contactItem: MondayContactItem,
  emailNorm: string,
): VolunteerTerm[] {
  const linkedEndedIds = parseLinkedServiceEndedIds(contactItem.column_values);
  const contactId = contactItem.id;
  const endedTerms: VolunteerTerm[] = [];
  const seenEndedIds = new Set<string>();

  for (const endedItem of serviceEndedItems) {
    const endedEmail = normalizeEmail(
      getServiceEndedColumnText(endedItem.column_values, 'email'),
    );
    const linkedContactIds = parseLinkedContactIdsFromServiceEnded(
      endedItem.column_values,
    );

    const belongsToContact =
      linkedEndedIds.includes(endedItem.id) ||
      linkedContactIds.includes(contactId) ||
      (endedEmail !== '' && endedEmail === emailNorm);

    if (!belongsToContact || seenEndedIds.has(endedItem.id)) continue;

    seenEndedIds.add(endedItem.id);
    endedTerms.push(mapServiceEndedItemToTerm(endedItem));
  }

  const replacedAppIds = new Set(
    endedTerms
      .map((term) => term.linkedApplicationItemId)
      .filter((id): id is string => Boolean(id)),
  );

  const remainingApps = applicationTerms.filter((term) => {
    if (replacedAppIds.has(term.itemId)) return false;
    return !endedTerms.some((ended) =>
      endedTermOverlapsApplication(ended, term),
    );
  });

  const sortedEnded = [...endedTerms].sort(
    (a, b) => parseTermEndSortKey(b.termEnd) - parseTermEndSortKey(a.termEnd),
  );

  return [...remainingApps, ...sortedEnded];
}

export function enrichContactDetail(
  contactItem: MondayContactItem,
  applications: MondayBoardItem[],
  allContacts: ContactListItem[],
  serviceEndedItems: MondayBoardItem[] = [],
  endOfServiceReviewItems: MondayBoardItem[] = [],
): Omit<
  ContactDetail,
  | Exclude<
      keyof ContactListItem,
      | 'demographics'
      | 'tags'
      | 'altEmail'
      | 'spouseName'
      | 'connectedTo'
      | 'pastorName'
      | 'searchHints'
    >
  | 'donations'
  | 'emailCorrespondence'
> {
  const base = mapItemToContactListItem(contactItem);
  const emailNorm = normalizeEmail(base.email);
  const matchEmails = contactMatchEmails(base);
  const linkedAppIds = parseLinkedApplicationIds(contactItem.column_values);

  const serviceTerms: VolunteerTerm[] = [];
  const linkedVolunteers: LinkedVolunteerSummary[] = [];
  let currentApplication: CurrentApplicationSummary | null = null;
  let isParentByEmail = false;
  let isPastorByEmail = false;

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
      linkedAppIds.includes(app.id) ||
      (volunteerEmail !== '' && matchEmails.has(volunteerEmail)) ||
      volunteerEmail === emailNorm;

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

    if (parentEmail && matchEmails.has(parentEmail)) {
      isParentByEmail = true;
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

    if (pastorEmail && matchEmails.has(pastorEmail)) {
      isPastorByEmail = true;
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

  // Fallbacks when app email columns don't match (merged Alt Email / name links).
  if (base.tags.includes('parent') || base.tags.includes('pastor')) {
    const seenNames = new Set(
      linkedVolunteers.map((link) => link.volunteerName.trim().toLowerCase()),
    );

    const pushLinked = (
      volunteer: ContactListItem,
      relationship: 'child' | 'reference',
      source: string,
    ) => {
      const key = volunteer.name.trim().toLowerCase();
      if (!key || seenNames.has(key) || volunteer.id === base.id) return;
      seenNames.add(key);
      linkedVolunteers.push({
        contactId: volunteer.id,
        applicationItemId: `${source}:${volunteer.id}`,
        volunteerName: volunteer.name,
        timelineLabel: 'Connected volunteer',
        status: '—',
        pipelineStage: '—',
        relationship,
      });
    };

    // This contact's Connected to: lists volunteer names (e.g. Haley Wagler).
    const connectedLabels = (base.connectedTo ?? '')
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .filter(
        (label) =>
          label.toLowerCase() !== base.name.trim().toLowerCase() &&
          !/^couple:/i.test(label),
      );
    for (const label of connectedLabels) {
      const matched = allContacts.find(
        (c) =>
          c.id !== base.id &&
          c.name.trim().toLowerCase() === label.toLowerCase() &&
          c.tags.includes('volunteer'),
      );
      if (!matched) continue;
      pushLinked(
        matched,
        base.tags.includes('parent') ? 'child' : 'reference',
        'connected-to',
      );
    }

    // Reverse: volunteers that name this person in Connected to: / pastor / spouse.
    const selfNames = new Set(
      [
        base.name,
        // Couple records like "Gary and Becky Wagler" — also match "Gary Wagler".
        ...base.name.split(/\s+&\s+|\s+and\s+/i).map((part) => part.trim()),
      ]
        .map((name) => name.toLowerCase())
        .filter(Boolean),
    );
    for (const volunteer of allContacts) {
      if (!volunteer.tags.includes('volunteer') || volunteer.id === base.id) {
        continue;
      }
      const haystack = [
        volunteer.connectedTo,
        volunteer.pastorName,
        volunteer.spouseName,
      ]
        .filter(Boolean)
        .join(' , ')
        .toLowerCase();
      if (!haystack) continue;
      const mentions = [...selfNames].some(
        (name) => name.length >= 3 && haystack.includes(name),
      );
      if (!mentions) continue;
      pushLinked(
        volunteer,
        base.tags.includes('parent') ? 'child' : 'reference',
        'reverse-link',
      );
    }
  }

  const mergedServiceTerms = mergeServiceEndedTerms(
    serviceTerms,
    serviceEndedItems,
    contactItem,
    emailNorm,
  );

  const serviceTermsWithReviews = matchEndOfServiceReviewsForContact(
    mergedServiceTerms,
    endOfServiceReviewItems,
    contactItem.id,
    base.email,
    base.name,
  );

  const replacedAppIds = new Set(
    serviceTermsWithReviews
      .filter((term) => isServiceEndedTerm(term))
      .map((term) => term.linkedApplicationItemId)
      .filter((id): id is string => Boolean(id)),
  );

  let resolvedCurrentApplication = currentApplication;
  if (
    resolvedCurrentApplication &&
    replacedAppIds.has(resolvedCurrentApplication.itemId)
  ) {
    const activeTerm = serviceTermsWithReviews.find(
      (term) =>
        !isServiceEndedTerm(term) &&
        term.recordType !== 'recruitment' &&
        term.timelineId !== 'recruitment',
    );
    resolvedCurrentApplication = activeTerm
      ? {
          itemId: activeTerm.itemId,
          stage: activeTerm.pipelineStage ?? '—',
          status: activeTerm.status ?? '—',
          timelineLabel: activeTerm.timelineLabel,
        }
      : null;
  }

  const contactDemographics = {
    address: getContactColumnText(contactItem.column_values, 'address'),
    city: getContactColumnText(contactItem.column_values, 'city'),
    state: getContactColumnText(contactItem.column_values, 'state'),
    zip: getContactColumnText(contactItem.column_values, 'zip'),
    country: getContactColumnText(contactItem.column_values, 'country'),
    dateOfBirth: normalizeDateOfBirth(
      getContactColumnDateText(contactItem.column_values, 'dateOfBirth'),
    ),
  };

  const volunteerApp = applications.find(
    (app) =>
      linkedAppIds.includes(app.id) ||
      normalizeEmail(getColumnText(app.column_values, 'email')) === emailNorm,
  );

  const applicationDemographics = volunteerApp
    ? resolveApplicationDemographics(volunteerApp.column_values)
    : undefined;

  const demographics = mergeContactAndApplicationDemographics(
    contactDemographics,
    applicationDemographics,
  );

  const contactFiles = getContactFilesFromColumns(contactItem.column_values);
  let files: VolunteerFile[] | undefined =
    contactFiles.length > 0 ? contactFiles : undefined;

  if (volunteerApp) {
    const appFiles = getApplicationFilesFromColumns(volunteerApp.column_values);
    if (appFiles.length > 0) {
      const merged = [...(files ?? []), ...appFiles];
      const seen = new Set<string>();
      files = merged.filter((file) => {
        const key = `${file.id}-${file.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  const passportFile = getContactPassportFile(contactItem.column_values);
  const pastorReference = mapContactPastorReference(contactItem.column_values);
  const linkedDonationItemIds = parseLinkedDonationItemIds(
    contactItem.column_values,
  );
  const spouseName =
    getContactColumnText(contactItem.column_values, 'spouseName') || undefined;
  const connectedTo =
    getContactColumnText(contactItem.column_values, 'connectedTo') || undefined;
  const emergencyContact =
    getContactColumnText(contactItem.column_values, 'emergencyContact') ||
    undefined;
  const emergencyPhone =
    getContactColumnText(contactItem.column_values, 'emergencyPhone') ||
    undefined;
  const tags = deriveDetailRoleTags({
    existingTags: base.tags,
    hasVolunteerService: serviceTermsWithReviews.length > 0,
    hasDonations: linkedDonationItemIds.length > 0,
    isParentByEmail,
    isPastorByEmail,
    relationTags: deriveTagsFromContactRelations(contactItem.column_values),
  });

  return {
    tags,
    quickbooksCustomerId:
      getContactColumnText(contactItem.column_values, 'quickbooksCustomerId') ||
      undefined,
    passportPhotoUrl: passportFile?.url,
    passportFile,
    demographics,
    files,
    currentApplication: resolvedCurrentApplication,
    serviceTerms: serviceTermsWithReviews,
    linkedVolunteers,
    pastorReference,
    ...(linkedDonationItemIds.length > 0 ? { linkedDonationItemIds } : {}),
    ...(spouseName ? { spouseName } : {}),
    ...(connectedTo ? { connectedTo } : {}),
    ...(emergencyContact ? { emergencyContact } : {}),
    ...(emergencyPhone ? { emergencyPhone } : {}),
    searchHints: [spouseName, connectedTo, pastorReference?.name]
      .filter(Boolean)
      .join(' '),
  };
}
