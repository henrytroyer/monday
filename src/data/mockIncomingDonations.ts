import type { FinancialRecord } from '../types/contact';
import { quickbooksInvoiceUrl } from '../types/quickbooks';

export interface IncomingDonation {
  id: string;
  donorName: string;
  donorEmail: string;
  quickbooksCustomerId?: string;
  record: FinancialRecord;
}

/** Sample donation feed for prototype sync demos. */
export const MOCK_INCOMING_DONATIONS: IncomingDonation[] = [
  {
    id: 'incoming-donation-1',
    donorName: 'Eleanor Whitfield',
    donorEmail: 'eleanor.whitfield@example.com',
    quickbooksCustomerId: 'qbo-customer-eleanor',
    record: {
      id: 'pay-incoming-1',
      kind: 'payment',
      date: '2026-05-18',
      amount: 250,
      currency: 'USD',
      description: 'Monthly sustaining gift',
      quickbooksInvoiceId: 'mock-invoice-500',
      quickbooksUrl: quickbooksInvoiceUrl('mock-invoice-500'),
      projectLabel: 'General operations',
      isPaid: true,
      donationType: 'recurring',
    },
  },
  {
    id: 'incoming-donation-2',
    donorName: 'Marcus Chen',
    donorEmail: 'marcus.chen@example.org',
    quickbooksCustomerId: 'qbo-customer-marcus',
    record: {
      id: 'pay-incoming-2',
      kind: 'payment',
      date: '2026-05-20',
      amount: 1000,
      currency: 'USD',
      description: 'One-time field support gift',
      quickbooksInvoiceId: 'mock-invoice-880',
      quickbooksUrl: quickbooksInvoiceUrl('mock-invoice-880'),
      projectLabel: 'Lesvos response',
      isPaid: true,
      donationType: 'one-time',
    },
  },
];

const INGESTED_KEY = 'crm-donation-ingest-ids';

function readIngestedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(INGESTED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeIngestedIds(ids: Set<string>): void {
  localStorage.setItem(INGESTED_KEY, JSON.stringify([...ids]));
}

export function getPendingIncomingDonations(): IncomingDonation[] {
  const ingested = readIngestedIds();
  return MOCK_INCOMING_DONATIONS.filter((donation) => !ingested.has(donation.id));
}

export function markIncomingDonationIngested(donationId: string): void {
  const ingested = readIngestedIds();
  ingested.add(donationId);
  writeIngestedIds(ingested);
}

export function resetIncomingDonationIngestState(): void {
  localStorage.removeItem(INGESTED_KEY);
}
