import {
  canEditContacts,
  useMockData,
} from '../config/boards';
import type { ContactDetail, ContactListItem, ContactTag } from '../types/contact';
import { aggregateContactEmailCorrespondence } from './contactEmailAggregation';
import {
  getPendingIncomingDonations,
  markIncomingDonationIngested,
} from '../data/mockIncomingDonations';
import { enrichContactDetail } from './buildContactRelationships';
import {
  fetchApplicationsBoardItems,
  fetchContactItem,
  fetchContactsBoard,
  fetchEndOfServiceReviewBoardItems,
  fetchServiceEndedBoardItems,
  updateContactFieldsOnMonday,
  updateContactPastorReferenceOnMonday,
  updateContactTagsOnMonday,
  deleteMondayItems,
} from './crmApi';
import {
  getContactDetailBase,
  getAllContacts,
  updateContactCoreFields,
  applyCoreFieldsToDetail,
  applyPastorReferenceToDetail,
  updateContactPastorReference,
  deleteMockContacts,
  type ContactCoreFields,
  type ContactPastorFields,
} from './contactStorage';
import { onContactCoreFieldsUpdated } from './contactRecruitmentSync';
import {
  getRecruitmentServiceRecords,
  isRecruitmentServiceTerm,
  upsertRecruitmentServiceRecord,
} from './contactServiceRecordStorage';
import { mapItemToContactListItem } from './mapMondayToContact';
import type { MondayBoardItem } from './mapMondayToCrm';
import { findProspectByContactId } from './recruitmentStorage';
import {
  syncContactFromDonation,
  type DonationSyncInput,
} from './contactDonationSync';
import {
  fetchContactDonationsFromMonday,
  mergeContactDonationRecords,
} from './contactDonationsMonday';
import { fetchContactFinancials } from './contactFinancials';
import { useQboIncomeSyncFromMonday } from './mondayDonorSync';
import {
  fetchSafeguardingCertificateByEmail,
  fetchSafeguardingCertificateFromContactLink,
} from './safeguardingCertificate';
import { resolveVolunteerFileSlots } from '../utils/volunteerFileSlots';
import type { VolunteerFile } from '../types/volunteer';

export interface ContactsFetchOptions {
  contactsBoardId?: string | null;
  applicationsBoardId?: string | null;
  donationsBoardId?: string | null;
  serviceEndedBoardId?: string | null;
  endOfServiceReviewBoardId?: string | null;
  clearCache?: boolean;
  /** Fetch fresh data even when an in-memory cache exists (keeps showing cached list). */
  refresh?: boolean;
  onPage?: (items: ContactListItem[], loaded: number) => void;
  /** Used to build an optimistic detail if refetch fails after a successful write. */
  fallbackDetail?: ContactDetail;
}

let liveContactsCache: ContactListItem[] | null = null;
let liveContactsCacheBoardId: string | null = null;
let liveApplicationsCache: MondayBoardItem[] | null = null;
let liveServiceEndedCache: MondayBoardItem[] | null = null;
let liveEndOfServiceReviewCache: MondayBoardItem[] | null = null;

const SESSION_CONTACTS_CACHE_KEY = 'crm-contacts-list-cache';

interface SessionContactsCache {
  boardId: string;
  contacts: ContactListItem[];
  savedAt: number;
}

function readSessionContactsCache(boardId: string): ContactListItem[] | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CONTACTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionContactsCache;
    if (parsed.boardId !== boardId || !Array.isArray(parsed.contacts)) {
      return null;
    }
    return parsed.contacts;
  } catch {
    return null;
  }
}

function writeSessionContactsCache(
  boardId: string,
  contacts: ContactListItem[],
): void {
  try {
    const payload: SessionContactsCache = {
      boardId,
      contacts,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(SESSION_CONTACTS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be full or unavailable
  }
}

function clearSessionContactsCache(): void {
  try {
    sessionStorage.removeItem(SESSION_CONTACTS_CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Return in-memory or session-restored contacts for instant list display. */
export function getContactsLiveCache(boardId?: string | null): ContactListItem[] {
  if (liveContactsCache && liveContactsCache.length > 0) {
    if (!boardId || liveContactsCacheBoardId === boardId) {
      return liveContactsCache;
    }
  }

  const resolvedBoardId =
    boardId ?? import.meta.env.VITE_CONTACTS_BOARD_ID?.trim() ?? null;
  if (!resolvedBoardId) return [];

  const sessionContacts = readSessionContactsCache(resolvedBoardId);
  if (sessionContacts && sessionContacts.length > 0) {
    liveContactsCache = sessionContacts;
    liveContactsCacheBoardId = resolvedBoardId;
    return sessionContacts;
  }

  return liveContactsCache ?? [];
}

export function clearContactsLiveCache(): void {
  liveContactsCache = null;
  liveContactsCacheBoardId = null;
  liveApplicationsCache = null;
  liveServiceEndedCache = null;
  clearSessionContactsCache();
}

export function removeFromContactsLiveCache(contactIds: string[]): void {
  if (!liveContactsCache || contactIds.length === 0) return;
  const remove = new Set(contactIds);
  liveContactsCache = liveContactsCache.filter((contact) => !remove.has(contact.id));
  if (liveContactsCacheBoardId) {
    writeSessionContactsCache(liveContactsCacheBoardId, liveContactsCache);
  }
}

async function getLiveApplications(
  applicationsBoardId?: string | null,
): Promise<MondayBoardItem[]> {
  if (!applicationsBoardId) return [];
  if (liveApplicationsCache) return liveApplicationsCache;
  liveApplicationsCache =
    await fetchApplicationsBoardItems(applicationsBoardId);
  return liveApplicationsCache;
}

async function getLiveServiceEndedItems(
  serviceEndedBoardId?: string | null,
): Promise<MondayBoardItem[]> {
  if (!serviceEndedBoardId) return [];
  if (liveServiceEndedCache) return liveServiceEndedCache;
  liveServiceEndedCache =
    await fetchServiceEndedBoardItems(serviceEndedBoardId);
  return liveServiceEndedCache;
}

async function getLiveEndOfServiceReviewItems(
  endOfServiceReviewBoardId?: string | null,
): Promise<MondayBoardItem[]> {
  if (!endOfServiceReviewBoardId) return [];
  if (liveEndOfServiceReviewCache) return liveEndOfServiceReviewCache;
  try {
    liveEndOfServiceReviewCache = await fetchEndOfServiceReviewBoardItems(
      endOfServiceReviewBoardId,
    );
  } catch {
    liveEndOfServiceReviewCache = [];
  }
  return liveEndOfServiceReviewCache;
}

export async function fetchContactsList(
  options?: ContactsFetchOptions,
): Promise<ContactListItem[]> {
  if (useMockData()) {
    return getAllContacts();
  }

  const boardId = options?.contactsBoardId;
  if (!boardId) {
    throw new Error(
      'Contacts board ID is required. Set VITE_CONTACTS_BOARD_ID or open the app from your Contacts board in monday.com.',
    );
  }

  if (options?.clearCache) {
    liveContactsCache = null;
    liveContactsCacheBoardId = null;
    liveApplicationsCache = null;
    liveServiceEndedCache = null;
    liveEndOfServiceReviewCache = null;
    clearSessionContactsCache();
  }

  if (!options?.clearCache && !options?.refresh && liveContactsCache) {
    return liveContactsCache;
  }

  liveContactsCache = await fetchContactsBoard(boardId, {
    onPage: (items, loaded) => {
      liveContactsCache = items;
      liveContactsCacheBoardId = boardId;
      writeSessionContactsCache(boardId, items);
      options?.onPage?.(items, loaded);
    },
  });
  liveContactsCacheBoardId = boardId;
  writeSessionContactsCache(boardId, liveContactsCache);
  return liveContactsCache;
}

function childSafeguardingFromMockFiles(
  files?: VolunteerFile[],
): VolunteerFile | undefined {
  if (!files?.length) return undefined;
  return resolveVolunteerFileSlots(undefined, files).childSafeguarding;
}

async function resolveContactChildSafeguardingFile(
  contactId: string,
  email: string | undefined,
): Promise<VolunteerFile | undefined> {
  try {
    const fromLink = await fetchSafeguardingCertificateFromContactLink(
      contactId,
    );
    if (fromLink) return fromLink.file;
  } catch {
    // optional — fall through to email lookup
  }

  try {
    const fromEmail = await fetchSafeguardingCertificateByEmail(email);
    return fromEmail?.file;
  } catch {
    return undefined;
  }
}

export async function fetchContactDetail(
  contactId: string,
  options?: ContactsFetchOptions,
): Promise<ContactDetail> {
  if (useMockData()) {
    const detail = getContactDetailBase(contactId);
    const prospect = findProspectByContactId(contactId);

    let recruitmentRecords = getRecruitmentServiceRecords(contactId);
    if (
      prospect &&
      !recruitmentRecords.some(
        (record) => record.recruitmentProspectId === prospect.id,
      )
    ) {
      recruitmentRecords = [
        upsertRecruitmentServiceRecord(contactId, prospect),
        ...recruitmentRecords,
      ];
    }

    const applicationTerms = detail.serviceTerms.filter(
      (term) => !isRecruitmentServiceTerm(term),
    );

    const serviceTerms = [...recruitmentRecords, ...applicationTerms];
    const emailCorrespondence =
      detail.emailCorrespondence ??
      (await aggregateContactEmailCorrespondence({
        contactId,
        contactEmail: detail.email,
        contactName: detail.name,
        serviceTerms,
      }));

    return {
      ...detail,
      childSafeguardingFile:
        detail.childSafeguardingFile ??
        childSafeguardingFromMockFiles(detail.files),
      emailCorrespondence,
      serviceTerms,
    };
  }

  const item = await fetchContactItem(contactId);
  const applications = await getLiveApplications(options?.applicationsBoardId);
  const serviceEndedItems = await getLiveServiceEndedItems(
    options?.serviceEndedBoardId,
  );
  const endOfServiceReviewItems = await getLiveEndOfServiceReviewItems(
    options?.endOfServiceReviewBoardId,
  );

  let allContacts = liveContactsCache;
  if (!allContacts && options?.contactsBoardId) {
    allContacts = await fetchContactsBoard(options.contactsBoardId);
    liveContactsCache = allContacts;
  }
  if (!allContacts) {
    allContacts = [mapItemToContactListItem(item)];
  }

  const base = mapItemToContactListItem(item);
  const enriched = enrichContactDetail(
    item,
    applications,
    allContacts,
    serviceEndedItems,
    endOfServiceReviewItems,
  );

  const recruitmentRecords = getRecruitmentServiceRecords(contactId);
  const prospect = findProspectByContactId(contactId);
  let mergedRecruitment = recruitmentRecords;
  if (
    prospect &&
    !recruitmentRecords.some(
      (record) => record.recruitmentProspectId === prospect.id,
    )
  ) {
    mergedRecruitment = [
      upsertRecruitmentServiceRecord(contactId, prospect),
      ...recruitmentRecords,
    ];
  }

  const applicationTerms = enriched.serviceTerms.filter(
    (term) => !isRecruitmentServiceTerm(term),
  );

  const donationsBoardId = options?.donationsBoardId;
  let mondayDonations: Awaited<ReturnType<typeof fetchContactDonationsFromMonday>> =
    [];
  if (donationsBoardId) {
    try {
      mondayDonations = await fetchContactDonationsFromMonday({
        boardId: donationsBoardId,
        email: base.email,
        linkedItemIds: enriched.linkedDonationItemIds,
      });
    } catch {
      mondayDonations = [];
    }
  }

  const qboIncomeSyncEnabled = useQboIncomeSyncFromMonday();
  let quickbooksDonations: Awaited<ReturnType<typeof fetchContactFinancials>> =
    [];
  if (!qboIncomeSyncEnabled) {
    try {
      quickbooksDonations = await fetchContactFinancials({
        email: base.email,
        quickbooksCustomerId: enriched.quickbooksCustomerId,
      });
    } catch {
      quickbooksDonations = [];
    }
  }

  const donations = qboIncomeSyncEnabled
    ? mondayDonations
    : mergeContactDonationRecords(mondayDonations, quickbooksDonations);

  const emailCorrespondence = await aggregateContactEmailCorrespondence({
    contactId,
    contactEmail: base.email,
    contactName: base.name,
    serviceTerms: [...mergedRecruitment, ...applicationTerms],
  });

  const childSafeguardingFile = await resolveContactChildSafeguardingFile(
    contactId,
    base.email !== '—' ? base.email : undefined,
  );

  return {
    ...base,
    ...enriched,
    childSafeguardingFile,
    emailCorrespondence,
    donations,
    serviceTerms: [...mergedRecruitment, ...applicationTerms],
  };
}

export async function updateContactCoreFieldsApi(
  contactId: string,
  fields: ContactCoreFields,
  options?: ContactsFetchOptions,
): Promise<ContactDetail> {
  if (!canEditContacts()) {
    throw new Error('Contacts are read-only: cannot update contact profile');
  }

  if (useMockData()) {
    updateContactCoreFields(contactId, fields);
    onContactCoreFieldsUpdated(contactId, fields);
    return fetchContactDetail(contactId);
  }

  const boardId = options?.contactsBoardId;
  if (!boardId) {
    throw new Error(
      'Contacts board ID is required to save contact profile changes.',
    );
  }

  await updateContactFieldsOnMonday(boardId, contactId, fields);
  clearContactsLiveCache();
  try {
    return await fetchContactDetail(contactId, options);
  } catch (fetchErr) {
    if (options?.fallbackDetail) {
      return applyCoreFieldsToDetail(options.fallbackDetail, fields);
    }
    throw fetchErr;
  }
}

export async function updateContactPastorReferenceApi(
  contactId: string,
  fields: ContactPastorFields,
  options?: ContactsFetchOptions,
): Promise<ContactDetail> {
  if (!canEditContacts()) {
    throw new Error('Contacts are read-only: cannot update pastor reference');
  }

  if (useMockData()) {
    updateContactPastorReference(contactId, fields);
    return fetchContactDetail(contactId);
  }

  const boardId = options?.contactsBoardId;
  if (!boardId) {
    throw new Error(
      'Contacts board ID is required to save pastor reference changes.',
    );
  }

  await updateContactPastorReferenceOnMonday(boardId, contactId, fields);
  clearContactsLiveCache();
  try {
    return await fetchContactDetail(contactId, options);
  } catch (fetchErr) {
    if (options?.fallbackDetail) {
      return applyPastorReferenceToDetail(options.fallbackDetail, fields);
    }
    throw fetchErr;
  }
}

export async function updateContactTags(
  contactId: string,
  tags: ContactTag[],
  options?: ContactsFetchOptions,
): Promise<void> {
  if (!canEditContacts()) {
    throw new Error('Contacts are read-only: cannot update contact tags');
  }

  if (useMockData()) {
    updateContactCoreFields(contactId, {
      name: getContactDetailBase(contactId).name,
      email: getContactDetailBase(contactId).email,
      phone: getContactDetailBase(contactId).phone,
      tags,
    });
    return;
  }

  const boardId = options?.contactsBoardId;
  if (!boardId) {
    throw new Error(
      'Contacts board ID is required to save contact tag changes.',
    );
  }

  await updateContactTagsOnMonday(boardId, contactId, tags);
  clearContactsLiveCache();
}

export async function deleteContacts(
  contactIds: string[],
  options?: ContactsFetchOptions,
): Promise<void> {
  if (!canEditContacts()) {
    throw new Error('Contacts are read-only: cannot delete contacts');
  }

  const uniqueIds = [...new Set(contactIds.map(String))].filter(Boolean);
  if (uniqueIds.length === 0) return;

  if (useMockData()) {
    deleteMockContacts(uniqueIds);
    return;
  }

  const boardId = options?.contactsBoardId;
  if (!boardId) {
    throw new Error(
      'Contacts board ID is required to delete contacts.',
    );
  }

  await deleteMondayItems(uniqueIds);
  removeFromContactsLiveCache(uniqueIds);
}

export async function ingestDonation(
  input: DonationSyncInput,
): Promise<ContactListItem> {
  if (!useMockData()) {
    throw new Error('Donation ingest is only available in mock mode.');
  }
  return syncContactFromDonation(input);
}

export async function ingestPendingDonations(): Promise<ContactListItem[]> {
  if (!useMockData()) {
    return [];
  }

  const pending = getPendingIncomingDonations();
  const synced: ContactListItem[] = [];

  for (const donation of pending) {
    synced.push(
      syncContactFromDonation({
        donorName: donation.donorName,
        donorEmail: donation.donorEmail,
        quickbooksCustomerId: donation.quickbooksCustomerId,
        record: donation.record,
      }),
    );
    markIncomingDonationIngested(donation.id);
  }

  return synced;
}
