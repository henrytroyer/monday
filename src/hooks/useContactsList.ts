import { useCallback, useEffect, useState } from 'react';
import { useMockData } from '../config/boards';
import { fetchContactsList } from '../services/contactsApi';
import type { ContactListItem } from '../types/contact';

export function useContactsList() {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMock = useMockData();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContactsList();
      setContacts(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load contacts',
      );
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { contacts, loading, error, isMock, refetch: load };
}
