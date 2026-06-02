import { useMockData } from '../config/boards';
import type {
  CreateQuickBooksInvoiceInput,
  QuickBooksInvoice,
  UpdateQuickBooksLineItemInput,
} from '../types/quickbooks';
import { quickbooksInvoiceUrl } from '../types/quickbooks';

const PROXY_BASE =
  import.meta.env.VITE_QUICKBOOKS_PROXY_URL?.replace(/\/$/, '') || '';

function proxyUrl(path: string): string {
  if (!PROXY_BASE) {
    throw new Error(
      'QuickBooks proxy is not configured. Set VITE_QUICKBOOKS_PROXY_URL and run npm run quickbooks:proxy.',
    );
  }
  return `${PROXY_BASE}${path}`;
}

export function mockQuickBooksInvoice(
  invoiceId: string,
  volunteerName: string,
): QuickBooksInvoice {
  const isPaid = invoiceId.endsWith('-paid');
  const balance = isPaid ? 0 : 450;
  return {
    id: invoiceId,
    docNumber: invoiceId.replace(/^mock-/, '').toUpperCase() || '1042',
    customerName: volunteerName,
    txnDate: '2026-05-01',
    dueDate: '2026-05-15',
    totalAmt: 450,
    balance,
    currency: 'USD',
    isPaid: balance === 0,
    statusLabel: balance === 0 ? 'Paid in full' : 'Open — balance due',
    quickbooksUrl: quickbooksInvoiceUrl(invoiceId),
    lineItems: [
      {
        id: '1',
        lineNum: 1,
        description: 'Program fee — summer term',
        quantity: 1,
        unitPrice: 400,
        amount: 400,
      },
      {
        id: '2',
        lineNum: 2,
        description: 'Registration fee',
        quantity: 1,
        unitPrice: 50,
        amount: 50,
      },
    ],
  };
}

export async function fetchQuickBooksInvoice(
  invoiceId: string,
  volunteerName: string,
): Promise<QuickBooksInvoice> {
  const trimmed = invoiceId.trim();
  if (!trimmed) {
    throw new Error('No QuickBooks invoice linked');
  }

  if (useMockData() || trimmed.startsWith('mock-')) {
    return mockQuickBooksInvoice(trimmed, volunteerName);
  }

  if (!PROXY_BASE) {
    return mockQuickBooksInvoice(trimmed, volunteerName);
  }

  const res = await fetch(
    proxyUrl(`/invoices/${encodeURIComponent(trimmed)}`),
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `QuickBooks API error (${res.status})`);
  }
  return res.json() as Promise<QuickBooksInvoice>;
}

export async function updateQuickBooksInvoiceLineItems(
  invoiceId: string,
  lineItems: UpdateQuickBooksLineItemInput[],
): Promise<QuickBooksInvoice> {
  const trimmed = invoiceId.trim();
  if (useMockData() || trimmed.startsWith('mock-')) {
    const base = mockQuickBooksInvoice(trimmed, 'Volunteer');
    const updated = lineItems.map((line, index) => ({
      id: line.id.startsWith('new-') ? String(index + 1) : line.id,
      lineNum: index + 1,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: Math.round(line.quantity * line.unitPrice * 100) / 100,
    }));
    const totalAmt = updated.reduce((sum, l) => sum + l.amount, 0);
    const balance = base.isPaid ? 0 : totalAmt;
    return {
      ...base,
      lineItems: updated,
      totalAmt,
      balance,
      isPaid: balance === 0,
      statusLabel: balance === 0 ? 'Paid in full' : 'Open — balance due',
    };
  }

  const res = await fetch(
    proxyUrl(`/invoices/${encodeURIComponent(trimmed)}/line-items`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineItems }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update invoice (${res.status})`);
  }
  return res.json() as Promise<QuickBooksInvoice>;
}

export async function createQuickBooksInvoice(
  input: CreateQuickBooksInvoiceInput,
): Promise<QuickBooksInvoice> {
  const customerName = input.customerName.trim() || 'Customer';
  const lineItems = input.lineItems ?? [];

  if (useMockData()) {
    const mockId = `mock-invoice-${Date.now()}`;
    const mapped = lineItems.map((line, index) => ({
      id: line.id.startsWith('new-') ? String(index + 1) : line.id,
      lineNum: index + 1,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      amount: Math.round(line.quantity * line.unitPrice * 100) / 100,
    }));
    const totalAmt = mapped.reduce((sum, l) => sum + l.amount, 0);
    return {
      id: mockId,
      docNumber: mockId.replace(/^mock-invoice-/, 'INV-'),
      customerName,
      txnDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      totalAmt,
      balance: totalAmt,
      currency: 'USD',
      isPaid: false,
      statusLabel: 'Open — balance due',
      quickbooksUrl: quickbooksInvoiceUrl(mockId),
      lineItems:
        mapped.length > 0
          ? mapped
          : [
              {
                id: '1',
                lineNum: 1,
                description: 'Program fee',
                quantity: 1,
                unitPrice: 0,
                amount: 0,
              },
            ],
    };
  }

  const res = await fetch(proxyUrl('/invoices'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName, lineItems }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create invoice (${res.status})`);
  }
  return res.json() as Promise<QuickBooksInvoice>;
}
