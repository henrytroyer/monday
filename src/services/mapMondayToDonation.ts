import { donationMap } from '../config/donationMap';
import type { FinancialRecord } from '../types/contact';
import type { MondayColumnValue } from './mapMondayToCrm';

export interface MondayDonationItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function findDonationColumn(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof donationMap,
): MondayColumnValue | undefined {
  const target = normalizeTitle(donationMap[fieldKey]);
  return columnValues.find(
    (c) => normalizeTitle(columnTitle(c)) === target,
  );
}

function getDonationColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof donationMap,
): string {
  return findDonationColumn(columnValues, fieldKey)?.text?.trim() || '';
}

function parseDonationDate(col: MondayColumnValue | undefined): string {
  if (!col) return '';

  const text = col.text?.trim();
  if (text) {
    const datePart = text.split(' ')[0];
    if (datePart) return datePart;
  }

  if (col.value) {
    try {
      const parsed = JSON.parse(col.value) as { date?: string };
      if (parsed.date) return parsed.date;
    } catch {
      // fall through
    }
  }

  return '';
}

function parseDonationAmount(col: MondayColumnValue | undefined): number {
  const text = col?.text?.trim();
  if (text) {
    const parsed = Number(text.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }

  if (col?.value) {
    try {
      const parsed = JSON.parse(col.value) as unknown;
      const asNumber = Number(parsed);
      if (Number.isFinite(asNumber)) return asNumber;
    } catch {
      const asNumber = Number(String(col.value).replace(/"/g, ''));
      if (Number.isFinite(asNumber)) return asNumber;
    }
  }

  return 0;
}

function inferDonationType(
  designation: string,
  details: string,
): 'one-time' | 'recurring' | undefined {
  const combined = `${designation} ${details}`.toLowerCase();
  if (/recurring|monthly|pledge|sustaining/.test(combined)) {
    return 'recurring';
  }
  return 'one-time';
}

function inferIsPaid(details: string): boolean {
  if (!details.trim()) return true;
  if (/status:\s*complete/i.test(details)) return true;
  if (/status:/i.test(details) && !/complete/i.test(details)) return false;
  return true;
}

export function mapMondayDonationToFinancialRecord(
  item: MondayDonationItem,
): FinancialRecord | null {
  const { column_values: columnValues } = item;
  const amount = parseDonationAmount(findDonationColumn(columnValues, 'amount'));
  if (amount <= 0) return null;

  const designation = getDonationColumnText(columnValues, 'designation');
  const details = getDonationColumnText(columnValues, 'details');
  const date =
    parseDonationDate(findDonationColumn(columnValues, 'date')) || '—';

  return {
    id: `monday-donation-${item.id}`,
    kind: 'payment',
    date,
    amount,
    currency: 'USD',
    description: designation.trim() || item.name,
    projectLabel: getDonationColumnText(columnValues, 'program') || undefined,
    isPaid: inferIsPaid(details),
    donationType: inferDonationType(designation, details),
  };
}

export function mondayDonationItemId(recordId: string): string | undefined {
  if (!recordId.startsWith('monday-donation-')) return undefined;
  return recordId.slice('monday-donation-'.length);
}
