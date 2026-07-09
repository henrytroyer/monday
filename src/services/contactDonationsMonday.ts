import type { FinancialRecord } from '../types/contact';
import {
  fetchDonationItemsByEmail,
  fetchDonationItemsByIds,
  resolveDonationEmailColumnId,
} from './crmApi';
import {
  mapMondayDonationToFinancialRecord,
  mondayDonationItemId,
  type MondayDonationItem,
} from './mapMondayToDonation';

export interface FetchContactDonationsOptions {
  boardId: string;
  email: string;
  linkedItemIds?: string[];
}

function mapDonationItems(
  items: MondayDonationItem[],
): FinancialRecord[] {
  const records: FinancialRecord[] = [];
  for (const item of items) {
    const record = mapMondayDonationToFinancialRecord(item);
    if (record) records.push(record);
  }
  return records;
}

function mergeDonationItemsById(
  linkedItems: MondayDonationItem[],
  emailItems: MondayDonationItem[],
): MondayDonationItem[] {
  const byId = new Map<string, MondayDonationItem>();
  for (const item of linkedItems) {
    byId.set(item.id, item);
  }
  for (const item of emailItems) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

export function mergeContactDonationRecords(
  mondayRecords: FinancialRecord[],
  quickbooksRecords: FinancialRecord[],
): FinancialRecord[] {
  const seen = new Set<string>();
  const merged = [...mondayRecords, ...quickbooksRecords].filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });

  return merged.sort(
    (a, b) => parseDonationDate(b.date) - parseDonationDate(a.date),
  );
}

function parseDonationDate(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchContactDonationsFromMonday(
  options: FetchContactDonationsOptions,
): Promise<FinancialRecord[]> {
  const { boardId, email, linkedItemIds = [] } = options;
  const uniqueLinkedIds = [...new Set(linkedItemIds.filter(Boolean))];

  const [linkedItems, emailColumnId] = await Promise.all([
    uniqueLinkedIds.length > 0
      ? fetchDonationItemsByIds(uniqueLinkedIds)
      : Promise.resolve([]),
    resolveDonationEmailColumnId(boardId),
  ]);

  const emailItems = await fetchDonationItemsByEmail(
    boardId,
    email,
    emailColumnId,
  );

  const mergedItems = mergeDonationItemsById(linkedItems, emailItems);
  return mapDonationItems(mergedItems);
}

export { mondayDonationItemId };
