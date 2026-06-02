export interface QuickBooksLineItem {
  id: string;
  lineNum: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface QuickBooksInvoice {
  id: string;
  docNumber: string;
  customerName: string;
  txnDate: string;
  dueDate: string;
  totalAmt: number;
  balance: number;
  currency: string;
  isPaid: boolean;
  statusLabel: string;
  lineItems: QuickBooksLineItem[];
  quickbooksUrl?: string;
}

export interface UpdateQuickBooksLineItemInput {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateQuickBooksInvoiceInput {
  customerName: string;
  lineItems: UpdateQuickBooksLineItemInput[];
}

export function quickbooksInvoiceUrl(invoiceId: string): string {
  return `https://app.qbo.intuit.com/app/invoice?txnId=${encodeURIComponent(invoiceId)}`;
}
