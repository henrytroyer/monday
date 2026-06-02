import { useCallback, useEffect, useState } from 'react';
import {
  createQuickBooksInvoice,
  fetchQuickBooksInvoice,
  updateQuickBooksInvoiceLineItems,
} from '../services/quickbooksApi';
import type {
  CreateQuickBooksInvoiceInput,
  QuickBooksInvoice,
} from '../types/quickbooks';
import type { UpdateQuickBooksLineItemInput } from '../types/quickbooks';

interface UseQuickBooksInvoiceOptions {
  invoiceId: string | undefined;
  volunteerName: string;
  enabled: boolean;
}

export function useQuickBooksInvoice({
  invoiceId,
  volunteerName,
  enabled,
}: UseQuickBooksInvoiceOptions) {
  const [activeInvoiceId, setActiveInvoiceId] = useState(invoiceId?.trim() ?? '');
  const [invoice, setInvoice] = useState<QuickBooksInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreateMode = !activeInvoiceId;

  useEffect(() => {
    setActiveInvoiceId(invoiceId?.trim() ?? '');
  }, [invoiceId]);

  const load = useCallback(async () => {
    if (!activeInvoiceId) {
      setInvoice(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuickBooksInvoice(activeInvoiceId, volunteerName);
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [activeInvoiceId, volunteerName]);

  useEffect(() => {
    if (enabled && activeInvoiceId) {
      load();
    } else if (!activeInvoiceId) {
      setInvoice(null);
      setError(null);
      setLoading(false);
    } else {
      setInvoice(null);
      setError(null);
    }
  }, [enabled, activeInvoiceId, load]);

  const saveLineItems = useCallback(
    async (lineItems: UpdateQuickBooksLineItemInput[]) => {
      if (!activeInvoiceId) return;
      setSaving(true);
      setError(null);
      try {
        const updated = await updateQuickBooksInvoiceLineItems(
          activeInvoiceId,
          lineItems,
        );
        setInvoice(updated);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to save line items',
        );
      } finally {
        setSaving(false);
      }
    },
    [activeInvoiceId],
  );

  const createInvoice = useCallback(
    async (input: CreateQuickBooksInvoiceInput) => {
      setSaving(true);
      setError(null);
      try {
        const created = await createQuickBooksInvoice(input);
        setActiveInvoiceId(created.id);
        setInvoice(created);
        return created;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create invoice',
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return {
    invoice,
    loading,
    saving,
    error,
    isCreateMode,
    activeInvoiceId,
    refresh: load,
    saveLineItems,
    createInvoice,
  };
}
