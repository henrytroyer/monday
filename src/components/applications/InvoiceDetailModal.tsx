import { useEffect, useMemo, useState } from 'react';
import { useMockData } from '../../config/boards';
import { useQuickBooksInvoice } from '../../hooks/useQuickBooksInvoice';
import { setQuickBooksInvoiceIdOnItem } from '../../services/crmApi';
import type { QuickBooksLineItem } from '../../types/quickbooks';
import type { UpdateQuickBooksLineItemInput } from '../../types/quickbooks';
import { quickbooksInvoiceUrl } from '../../types/quickbooks';

interface InvoiceDetailModalProps {
  invoiceId?: string;
  volunteerName: string;
  mondayStatus: string;
  itemId?: string;
  boardId?: string | null;
  onInvoiceLinked?: (invoiceId: string) => void;
  onClose: () => void;
}

function defaultCreateLines(): QuickBooksLineItem[] {
  return [
    {
      id: `new-${Date.now()}`,
      lineNum: 1,
      description: 'Program fee',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    },
  ];
}

function newLineItem(lineNum: number): QuickBooksLineItem {
  return {
    id: `new-${Date.now()}-${lineNum}`,
    lineNum,
    description: '',
    quantity: 1,
    unitPrice: 0,
    amount: 0,
  };
}

export default function InvoiceDetailModal({
  invoiceId: initialInvoiceId,
  volunteerName,
  mondayStatus,
  itemId,
  boardId,
  onInvoiceLinked,
  onClose,
}: InvoiceDetailModalProps) {
  const {
    invoice,
    loading,
    saving,
    error,
    isCreateMode,
    activeInvoiceId,
    refresh,
    saveLineItems,
    createInvoice,
  } = useQuickBooksInvoice({
    invoiceId: initialInvoiceId,
    volunteerName,
    enabled: true,
  });

  const [draftLines, setDraftLines] = useState<QuickBooksLineItem[]>([]);
  const [dirty, setDirty] = useState(false);

  const viewUrl = useMemo(() => {
    if (invoice?.quickbooksUrl) return invoice.quickbooksUrl;
    if (activeInvoiceId) return quickbooksInvoiceUrl(activeInvoiceId);
    return undefined;
  }, [invoice?.quickbooksUrl, activeInvoiceId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (invoice?.lineItems) {
      setDraftLines(invoice.lineItems.map((l) => ({ ...l })));
      setDirty(false);
    } else if (isCreateMode) {
      setDraftLines(defaultCreateLines());
      setDirty(true);
    }
  }, [invoice, isCreateMode]);

  const livePaid = invoice?.isPaid;
  const liveStatus = invoice?.statusLabel ?? '—';
  const currency = invoice?.currency ?? 'USD';

  const handleLineChange = (
    index: number,
    field: keyof Pick<
      QuickBooksLineItem,
      'description' | 'quantity' | 'unitPrice'
    >,
    value: string | number,
  ) => {
    setDraftLines((prev) => {
      const next = [...prev];
      const line = { ...next[index] };
      if (field === 'description') {
        line.description = String(value);
      } else if (field === 'quantity') {
        line.quantity = Number(value) || 0;
      } else {
        line.unitPrice = Number(value) || 0;
      }
      line.amount =
        Math.round(line.quantity * line.unitPrice * 100) / 100;
      next[index] = line;
      return next;
    });
    setDirty(true);
  };

  const handleAddLine = () => {
    setDraftLines((prev) => [...prev, newLineItem(prev.length + 1)]);
    setDirty(true);
  };

  const handleRemoveLine = (index: number) => {
    setDraftLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setDirty(true);
  };

  const linePayload = (): UpdateQuickBooksLineItemInput[] =>
    draftLines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    }));

  const handleSave = async () => {
    await saveLineItems(linePayload());
    setDirty(false);
  };

  const handleCreate = async () => {
    const created = await createInvoice({
      customerName: volunteerName,
      lineItems: linePayload(),
    });
    if (!created) return;

    if (
      itemId &&
      boardId &&
      !useMockData() &&
      !itemId.startsWith('mock-')
    ) {
      try {
        await setQuickBooksInvoiceIdOnItem(boardId, itemId, created.id);
      } catch (linkErr) {
        console.error(linkErr);
      }
    }

    onInvoiceLinked?.(created.id);
    setDirty(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="invoice-detail-title"
              className="text-lg font-semibold text-slate-900"
            >
              {isCreateMode ? 'Create QuickBooks invoice' : 'QuickBooks invoice'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isCreateMode
                ? `New invoice for ${volunteerName} · monday status: ${mondayStatus}`
                : `Linked to Invoice Paid · monday status: ${mondayStatus}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isCreateMode && (
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Refresh
              </button>
            )}
            {viewUrl && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                View in QuickBooks
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && !isCreateMode && (
            <p className="text-center text-sm text-slate-500">
              Loading from QuickBooks…
            </p>
          )}

          {error && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {error}
            </p>
          )}

          {(isCreateMode || invoice) && !loading && (
            <div className="space-y-6">
              {!isCreateMode && invoice && (
                <>
                  <div className="flex flex-wrap gap-3">
                    <StatusPill
                      label="QuickBooks"
                      value={liveStatus}
                      variant={livePaid ? 'paid' : 'open'}
                    />
                    <StatusPill
                      label="Balance"
                      value={`${formatMoney(invoice.balance, currency)} / ${formatMoney(invoice.totalAmt, currency)}`}
                      variant={livePaid ? 'paid' : 'open'}
                    />
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Invoice #</dt>
                      <dd className="font-medium text-slate-900">
                        {invoice.docNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Customer</dt>
                      <dd className="font-medium text-slate-900">
                        {invoice.customerName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Invoice date</dt>
                      <dd className="font-medium text-slate-900">
                        {invoice.txnDate || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Due date</dt>
                      <dd className="font-medium text-slate-900">
                        {invoice.dueDate || '—'}
                      </dd>
                    </div>
                  </dl>
                </>
              )}

              {isCreateMode && (
                <p className="text-sm text-slate-600">
                  Customer name in QuickBooks:{' '}
                  <span className="font-medium text-slate-900">
                    {volunteerName}
                  </span>
                  . Add line items below, then create the invoice. The invoice
                  id can be saved to the monday item when linked.
                </p>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Line items
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Add line item
                    </button>
                    {isCreateMode ? (
                      <button
                        type="button"
                        disabled={saving || draftLines.length === 0}
                        onClick={handleCreate}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {saving ? 'Creating…' : 'Create invoice'}
                      </button>
                    ) : (
                      dirty && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={handleSave}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Save to QuickBooks'}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Description</th>
                        <th className="w-20 px-3 py-2">Qty</th>
                        <th className="w-24 px-3 py-2">Rate</th>
                        <th className="w-24 px-3 py-2 text-right">Amount</th>
                        <th className="w-12 px-3 py-2" aria-label="Remove" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {draftLines.map((line, index) => (
                        <tr key={line.id}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) =>
                                handleLineChange(
                                  index,
                                  'description',
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={line.quantity}
                              onChange={(e) =>
                                handleLineChange(
                                  index,
                                  'quantity',
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={line.unitPrice}
                              onChange={(e) =>
                                handleLineChange(
                                  index,
                                  'unitPrice',
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-900">
                            {formatMoney(line.amount, currency)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {draftLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(index)}
                                className="text-slate-400 hover:text-red-600"
                                aria-label="Remove line"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {isCreateMode
                    ? 'New lines are included when you create the invoice. View in QuickBooks opens the invoice directly after it is created.'
                    : 'Add lines with Add line item, then Save to QuickBooks. Payment status updates on Refresh.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'paid' | 'open';
}) {
  const colors =
    variant === 'paid'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-amber-100 text-amber-800';
  return (
    <div className={`rounded-full px-4 py-2 text-sm ${colors}`}>
      <span className="font-medium">{label}:</span> {value}
    </div>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
