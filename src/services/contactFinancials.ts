import { useMockData } from '../config/boards';
import type { FinancialRecord } from '../types/contact';
import { quickbooksInvoiceUrl } from '../types/quickbooks';

const PROXY_BASE =
  import.meta.env.VITE_QUICKBOOKS_PROXY_URL?.replace(/\/$/, '') || '';

function proxyUrl(path: string): string {
  if (!PROXY_BASE) {
    throw new Error('QuickBooks proxy is not configured');
  }
  return `${PROXY_BASE}${path}`;
}

const MOCK_FINANCIALS: Record<string, FinancialRecord[]> = {
  'qbo-customer-john': [
    {
      id: 'pay-1',
      kind: 'payment',
      date: '2026-05-10',
      amount: 450,
      currency: 'USD',
      description: 'Program fee payment',
      quickbooksInvoiceId: 'mock-invoice-1042-paid',
      quickbooksUrl: quickbooksInvoiceUrl('mock-invoice-1042-paid'),
      projectLabel: 'Summer 2026 — Team A',
      isPaid: true,
    },
  ],
  'qbo-customer-eleanor': [
    {
      id: 'inv-e1',
      kind: 'invoice',
      date: '2026-03-15',
      amount: 500,
      currency: 'USD',
      description: 'Annual donor gift',
      quickbooksInvoiceId: 'mock-invoice-500',
      quickbooksUrl: quickbooksInvoiceUrl('mock-invoice-500'),
      projectLabel: 'General operations',
      isPaid: false,
    },
  ],
};

export async function fetchContactFinancials(options: {
  email: string;
  quickbooksCustomerId?: string;
  mockContactId?: string;
}): Promise<FinancialRecord[]> {
  const customerId = options.quickbooksCustomerId?.trim();
  const email = options.email.trim();

  if (useMockData() || customerId?.startsWith('qbo-') || customerId?.startsWith('mock-')) {
    if (customerId && MOCK_FINANCIALS[customerId]) {
      return MOCK_FINANCIALS[customerId];
    }
    return [];
  }

  if (!PROXY_BASE) return [];

  try {
    if (customerId) {
      const res = await fetch(
        proxyUrl(
          `/customers/${encodeURIComponent(customerId)}/financials`,
        ),
      );
      if (res.ok) {
        return (await res.json()) as FinancialRecord[];
      }
    }

    if (email && email !== '—') {
      const res = await fetch(
        proxyUrl(
          `/customers/by-email/financials?email=${encodeURIComponent(email)}`,
        ),
      );
      if (res.ok) {
        return (await res.json()) as FinancialRecord[];
      }
    }
  } catch {
    return [];
  }

  return [];
}
