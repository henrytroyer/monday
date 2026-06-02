import { useCallback, useEffect, useState } from 'react';
import { fetchContactDetail } from '../services/contactsApi';
import type { ContactDetail } from '../types/contact';

export function useContactDetail(contactId: string | null) {
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contactId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContactDetail(contactId);
      setDetail(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load contact',
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    load();
  }, [load]);

  return { detail, loading, error, refetch: load };
}
