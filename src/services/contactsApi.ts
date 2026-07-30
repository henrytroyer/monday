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
  compileContactsFromBoards,
  isCompiledContactId,
} from './compileContactsFromBoards';
import { contactTagsEqual } from './contactRoleTags';
import { mergeTags } from './contactSyncHelpers';
import {
  fetchApplicationsBoardItems,
  fetchContactItem,
  fetchContactsBoard,
  fetchEndOfServiceReviewBoardItems,
  fetchLongtermApplicationsBoardItems,
  fetchServiceEndedBoardItems,
  updateContactFieldsOnMonday,
  updateContactPastorReferenceOnMonday,
  updateContactTagsOnMonday,
  deleteMondayItems,
} from './crmApi';
import {
  contactDetailCacheKey,
  getCachedContactDetail,
  invalidateContactDetail,
  setCachedContactDetail,
  clearSessionDetailCache,
} from './sessionDetailCache';
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
import {
  mapItemToContactListItem,
  parseContactTags,
} from './mapMondayToContact';
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
  longtermApplicationsBoardId?: string | null;
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

export interface ContactsCompileStats {
  fromContactsBoard: number;
  addedFromOtherBoards: number;
  mergedDuplicates: number;
  withStreetAddress: number;
  shortTermApps: number;
  longTermApps: number;
  serviceEnded: number;
  donations: number;
}

let liveContactsCache: ContactListItem[] | null = null;
let liveContactsCacheBoardId: string | null = null;
let liveContactsCompileStats: ContactsCompileStats | null = null;
let liveApplicationsCache: MondayBoardItem[] | null = null;
let liveLongtermApplicationsCache: MondayBoardItem[] | null = null;
let liveDonationsCache: MondayBoardItem[] | null = null;
let liveServiceEndedCache: MondayBoardItem[] | null = null;
let liveEndOfServiceReviewCache: MondayBoardItem[] | null = null;

/** Bump when compile shape changes so stale session lists are discarded. */
const SESSION_CONTACTS_CACHE_KEY = 'crm-contacts-list-cache-v2';

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
  liveContactsCompileStats = null;
  liveApplicationsCache = null;
  liveLongtermApplicationsCache = null;
  liveDonationsCache = null;
  liveServiceEndedCache = null;
  liveEndOfServiceReviewCache = null;
  clearSessionContactsCache();
  clearSessionDetailCache();
}

export function getContactsCompileStats(): ContactsCompileStats | null {
  return liveContactsCompileStats;
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

async function getLiveLongtermApplications(
  longtermApplicationsBoardId?: string | null,
): Promise<MondayBoardItem[]> {
  if (!longtermApplicationsBoardId) return [];
  if (liveLongtermApplicationsCache) return liveLongtermApplicationsCache;
  liveLongtermApplicationsCache = await fetchLongtermApplicationsBoardItems(
    longtermApplicationsBoardId,
  );
  return liveLongtermApplicationsCache;
}

async function getLiveDonationItems(
  donationsBoardId?: string | null,
): Promise<MondayBoardItem[]> {
  if (!donationsBoardId) return [];
  if (liveDonationsCache) return liveDonationsCache;
  // Donations board uses the same paginated items query as applications.
  liveDonationsCache = await fetchApplicationsBoardItems(donationsBoardId);
  return liveDonationsCache;
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

function buildCompiledContactDetail(listItem: ContactListItem): ContactDetail {
  return {
    ...listItem,
    emailCorrespondence: [],
    currentApplication: null,
    serviceTerms: [],
    linkedVolunteers: [],
    donations: [],
  };
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
      'Contacts board ID is required. Set VITE_CONTACTS_BOARD_ID in .env.',
    );
  }

  if (options?.clearCache) {
    clearContactsLiveCache();
  }

  if (!options?.clearCache && !options?.refresh && liveContactsCache) {
    return liveContactsCache;
  }

  const baseContacts = await fetchContactsBoard(boardId, {
    onPage: (items, loaded) => {
      // Progressive paint from Contacts board while other boards load.
      liveContactsCache = items;
      liveContactsCacheBoardId = boardId;
      writeSessionContactsCache(boardId, items);
      options?.onPage?.(items, loaded);
    },
  });
  liveContactsCacheBoardId = boardId;

  const [shortTerm, longTerm, serviceEnded, donations] = await Promise.all([
    getLiveApplications(options?.applicationsBoardId).catch(() => []),
    getLiveLongtermApplications(options?.longtermApplicationsBoardId).catch(
      () => [],
    ),
    getLiveServiceEndedItems(options?.serviceEndedBoardId).catch(() => []),
    getLiveDonationItems(options?.donationsBoardId).catch(() => []),
  ]);

  const compiled = compileContactsFromBoards({
    contacts: baseContacts,
    shortTermApplications: shortTerm,
    longTermApplications: longTerm,
    serviceEndedItems: serviceEnded,
    donationItems: donations,
  });

  liveContactsCache = compiled.contacts;
  liveContactsCompileStats = compiled.stats;
  liveContactsCacheBoardId = boardId;
  writeSessionContactsCache(boardId, liveContactsCache);
  options?.onPage?.(liveContactsCache, liveContactsCache.length);
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
  options?: ContactsFetchOptions & { refresh?: boolean },
): Promise<ContactDetail> {
  if (isCompiledContactId(contactId)) {
    const listItem =
      liveContactsCache?.find((contact) => contact.id === contactId) ??
      (options?.contactsBoardId
        ? getContactsLiveCache(options.contactsBoardId).find(
            (contact) => contact.id === contactId,
          )
        : undefined);
    if (!listItem) {
      throw new Error(
        'This contact was compiled from other boards and is not on the Contacts board yet.',
      );
    }
    return buildCompiledContactDetail(listItem);
  }

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

  const cacheKey = contactDetailCacheKey(contactId, {
    contactsBoardId: options?.contactsBoardId,
    applicationsBoardId: options?.applicationsBoardId,
    donationsBoardId: options?.donationsBoardId,
  });
  if (!options?.refresh) {
    const cached = getCachedContactDetail(cacheKey);
    if (cached) return cached;
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

  const mergedTags = mergeTags(
    enriched.tags ?? base.tags,
    donations.length > 0 ? ['donor'] : [],
  );

  const result: ContactDetail = {
    ...base,
    ...enriched,
    tags: mergedTags,
    childSafeguardingFile,
    emailCorrespondence,
    donations,
    serviceTerms: [...mergedRecruitment, ...applicationTerms],
  };

  // Persist newly derived role tags (e.g. volunteer who also donates) when writable.
  const storedTags = parseContactTags(item.column_values);
  const boardId = options?.contactsBoardId;
  if (
    boardId &&
    canEditContacts() &&
    !contactTagsEqual(storedTags, mergedTags)
  ) {
    try {
      await updateContactTagsOnMonday(boardId, contactId, mergedTags);
      if (liveContactsCache) {
        liveContactsCache = liveContactsCache.map((contact) =>
          contact.id === contactId ? { ...contact, tags: mergedTags } : contact,
        );
        writeSessionContactsCache(boardId, liveContactsCache);
      }
    } catch {
      // Keep derived tags in the CRM view even if monday write fails.
    }
  }

  setCachedContactDetail(cacheKey, result);
  return result;
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
  invalidateContactDetail(contactId);
  clearContactsLiveCache();
  try {
    return await fetchContactDetail(contactId, { ...options, refresh: true });
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
  invalidateContactDetail(contactId);
  clearContactsLiveCache();
  try {
    return await fetchContactDetail(contactId, { ...options, refresh: true });
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
    const { createDonationOnMonday } = await import('./createDonationOnMonday');
    await createDonationOnMonday({
      donorName: input.donorName,
      donorEmail: input.donorEmail,
      amount:
        input.record?.amount != null ? String(input.record.amount) : undefined,
      date: input.record?.date,
      program: input.record?.projectLabel,
      details: input.record?.description,
    });
    // Prefer returning the contact list item when we can resolve by email.
    if (input.donorEmail) {
      const match = await fetchContactsList().catch(() => []);
      const found = match.find(
        (c) =>
          c.email.trim().toLowerCase() ===
          input.donorEmail!.trim().toLowerCase(),
      );
      if (found) return found;
    }
    return {
      id: `donation-pending-${Date.now()}`,
      name: input.donorName,
      email: input.donorEmail || '—',
      phone: '',
      tags: ['donor'],
      createdAt: new Date().toISOString(),
    };
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
