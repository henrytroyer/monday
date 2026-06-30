import type { ContactListItem, FinancialRecord } from '../types/contact';
import {
  findContactByEmail,
  getContactDetailBase,
  getContactListItem,
} from './contactStorage';
import { upsertContactByEmail } from './contactSyncHelpers';
import {
  findContactIdByQuickbooksCustomerId,
  getContactSyncPayload,
  patchContactSyncPayload,
  upsertDonationRecord,
} from './contactSyncStorage';

export interface DonationSyncInput {
  donorName: string;
  donorEmail: string;
  quickbooksCustomerId?: string;
  record: FinancialRecord;
}

export function syncContactFromDonation(
  input: DonationSyncInput,
): ContactListItem {
  const donorName = input.donorName.trim();
  const donorEmail = input.donorEmail.trim();
  const quickbooksCustomerId = input.quickbooksCustomerId?.trim();

  let existing =
    donorEmail && donorEmail !== '—'
      ? findContactByEmail(donorEmail)
      : undefined;

  if (!existing && quickbooksCustomerId) {
    const contactId = findContactIdByQuickbooksCustomerId(quickbooksCustomerId);
    if (contactId) {
      existing = getContactListItem(contactId);
    }
  }

  const contact = upsertContactByEmail({
    name: donorName || existing?.name || 'Donor',
    email: donorEmail || existing?.email || '—',
    tags: ['donor'],
  });

  const existingSync = getContactSyncPayload(contact.id);
  const existingDonations =
    existingSync?.donations ?? getContactDetailBase(contact.id).donations;

  patchContactSyncPayload(contact.id, {
    donations: upsertDonationRecord(existingDonations, input.record),
    ...(quickbooksCustomerId ? { quickbooksCustomerId } : {}),
  });

  return contact;
}
