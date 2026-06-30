import {
  isMondayReadOnly,
  useMockData,
} from '../config/boards';
import type { ContactDetail, ContactListItem, ContactTag } from '../types/contact';
import { buildMockContactEmailThread } from '../data/mockContactEmailThread';
import {
  getPendingIncomingDonations,
  markIncomingDonationIngested,
} from '../data/mockIncomingDonations';
import { enrichContactDetail } from './buildContactRelationships';
import {
  fetchApplicationsBoardItems,
  fetchContactItem,
  fetchContactsBoard,
  updateContactFieldsOnMonday,
} from './crmApi';
import {
  getContactDetailBase,
  getAllContacts,
  updateContactCoreFields,
  type ContactCoreFields,
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

export interface ContactsFetchOptions {
  contactsBoardId?: string | null;
  applicationsBoardId?: string | null;
  clearCache?: boolean;
  onPage?: (items: ContactListItem[], loaded: number) => void;
}

let liveContactsCache: ContactListItem[] | null = null;
let liveApplicationsCache: MondayBoardItem[] | null = null;

export function clearContactsLiveCache(): void {
  liveContactsCache = null;
  liveApplicationsCache = null;
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

  if (!options?.clearCache && liveContactsCache) {
    return liveContactsCache;
  }

  liveContactsCache = await fetchContactsBoard(boardId, {
    onPage: (items, loaded) => {
      liveContactsCache = items;
      options?.onPage?.(items, loaded);
    },
  });
  return liveContactsCache;
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

    return {
      ...detail,
      emailCorrespondence:
        detail.emailCorrespondence ??
        buildMockContactEmailThread(contactId, {
          name: detail.name,
          email: detail.email,
        }),
      serviceTerms: [...recruitmentRecords, ...applicationTerms],
    };
  }

  const item = await fetchContactItem(contactId);
  const applications = await getLiveApplications(options?.applicationsBoardId);

  let allContacts = liveContactsCache;
  if (!allContacts && options?.contactsBoardId) {
    allContacts = await fetchContactsBoard(options.contactsBoardId);
    liveContactsCache = allContacts;
  }
  if (!allContacts) {
    allContacts = [mapItemToContactListItem(item)];
  }

  const base = mapItemToContactListItem(item);
  const enriched = enrichContactDetail(item, applications, allContacts);

  return {
    ...base,
    ...enriched,
    emailCorrespondence: [],
    donations: [],
  };
}

export async function updateContactCoreFieldsApi(
  contactId: string,
  fields: ContactCoreFields,
  options?: ContactsFetchOptions,
): Promise<ContactDetail> {
  if (isMondayReadOnly()) {
    throw new Error('Read-only mode: cannot update contact profile');
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
  return fetchContactDetail(contactId, options);
}

export async function updateContactTags(
  _contactId: string,
  _tags: ContactTag[],
): Promise<void> {
  if (isMondayReadOnly()) {
    throw new Error('Read-only mode: cannot update contact tags');
  }
  return;
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
