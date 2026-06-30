import type { FinancialRecord } from '../types/contact';

const PROJECT_LABELS = [
  'Lesvos field support',
  'Germany housing fund',
  'General operations',
  'Volunteer scholarships',
  'Refugee relief',
  'Equipment & supplies',
  'Prayer partner fund',
  'Building & facilities',
];

const ONE_TIME_DESCRIPTIONS = [
  'Year-end gift',
  'Spring campaign donation',
  'Memorial gift',
  'Employer matching gift',
  'Special appeal',
  'Emergency relief gift',
  'Building fund contribution',
  'Christmas offering',
  'Mission Sunday gift',
  'Anonymous one-time gift',
];

const RECURRING_DESCRIPTIONS = [
  'Monthly partner gift',
  'Monthly recurring donation',
  'Quarterly sustaining gift',
  'Monthly field support',
  'Quarterly partner pledge',
];

/** Reference date for mock history (matches CRM demo timeline). */
const HISTORY_END = new Date(2026, 5, 9);
const HISTORY_START = new Date(2021, 0, 1);

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function createRecord(
  contactId: string,
  index: number,
  date: Date,
  amount: number,
  description: string,
  projectLabel: string,
  donationType: 'one-time' | 'recurring',
  isPaid: boolean,
): FinancialRecord {
  const txnId = `mock-txn-${contactId}-${index}`;
  return {
    id: `${contactId}-don-${index}`,
    kind: isPaid ? 'payment' : 'invoice',
    date: formatDisplayDate(date),
    amount: roundMoney(amount),
    currency: 'USD',
    description,
    donationType,
    projectLabel,
    isPaid,
    quickbooksInvoiceId: isPaid ? undefined : txnId,
    quickbooksUrl: isPaid
      ? undefined
      : `https://app.qbo.intuit.com/app/invoice?txnId=${txnId}`,
  };
}

/**
 * Deterministic 5-year donation history for mock donor contacts.
 * Mix of monthly/quarterly recurring gifts and assorted one-time donations.
 */
export function buildMockDonorHistory(
  contactId: string,
  options?: { includeProgramFees?: boolean },
): FinancialRecord[] {
  const rand = createRng(hashString(contactId));
  const records: FinancialRecord[] = [];
  let index = 0;

  const hasRecurring = rand() > 0.28;
  const hasSecondRecurring = hasRecurring && rand() > 0.72;
  const recurringIntervalMonths = rand() > 0.45 ? 1 : 3;
  const baseRecurring = [25, 35, 50, 75, 100, 150, 200, 250][
    Math.floor(rand() * 8)
  ]!;

  if (hasRecurring) {
    const startOffsetMonths = Math.floor(rand() * 24);
    let cursor = addMonths(HISTORY_START, startOffsetMonths);
    cursor.setDate(1 + Math.floor(rand() * 27));

    while (cursor <= HISTORY_END) {
      const jitter = 0.85 + rand() * 0.3;
      records.push(
        createRecord(
          contactId,
          index++,
          new Date(cursor),
          baseRecurring * jitter,
          pick(rand, RECURRING_DESCRIPTIONS),
          pick(rand, PROJECT_LABELS),
          'recurring',
          rand() > 0.02,
        ),
      );
      cursor = addMonths(cursor, recurringIntervalMonths);
      if (rand() < 0.04) {
        cursor = addMonths(cursor, recurringIntervalMonths);
      }
    }
  }

  if (hasSecondRecurring) {
    const smallerBase = Math.max(15, Math.round(baseRecurring * 0.45));
    let cursor = addMonths(HISTORY_START, 6 + Math.floor(rand() * 18));
    cursor.setDate(1 + Math.floor(rand() * 27));

    while (cursor <= HISTORY_END) {
      records.push(
        createRecord(
          contactId,
          index++,
          new Date(cursor),
          smallerBase * (0.9 + rand() * 0.2),
          pick(rand, RECURRING_DESCRIPTIONS),
          pick(rand, PROJECT_LABELS),
          'recurring',
          true,
        ),
      );
      cursor = addMonths(cursor, 3);
    }
  }

  for (let year = 2021; year <= 2026; year++) {
    const giftsThisYear =
      year === 2026
        ? 1 + Math.floor(rand() * 3)
        : 2 + Math.floor(rand() * 5);

    for (let g = 0; g < giftsThisYear; g++) {
      const month = year === 2026 ? Math.min(5, Math.floor(rand() * 6)) : Math.floor(rand() * 12);
      const day = 1 + Math.floor(rand() * 28);
      const date = new Date(year, month, day);
      if (date > HISTORY_END || date < HISTORY_START) continue;

      const amount =
        rand() > 0.85
          ? 500 + rand() * 2000
          : 50 + rand() * 450;
      const isPaid = rand() > 0.08;

      records.push(
        createRecord(
          contactId,
          index++,
          date,
          amount,
          pick(rand, ONE_TIME_DESCRIPTIONS),
          pick(rand, PROJECT_LABELS),
          'one-time',
          isPaid,
        ),
      );
    }
  }

  if (options?.includeProgramFees) {
    records.push(
      createRecord(
        contactId,
        index++,
        new Date(2026, 4, 10),
        450,
        'Program fee payment',
        'Summer 2026 — Team A',
        'one-time',
        true,
      ),
      createRecord(
        contactId,
        index++,
        new Date(2025, 8, 12),
        425,
        'Program fee payment',
        'Fall 2025 — Team B',
        'one-time',
        true,
      ),
    );
  }

  return records.sort(
    (a, b) => parseRecordDate(b.date).getTime() - parseRecordDate(a.date).getTime(),
  );
}

function parseRecordDate(display: string): Date {
  return new Date(display);
}

export function mockQuickbooksCustomerId(contactId: string): string {
  return `qbo-customer-${contactId}`;
}
